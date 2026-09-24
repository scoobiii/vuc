import crypto from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import { getOAuthStore } from './oauth-store.js';

type Client = { client_id: string; redirect_uris: string[]; client_name?: string; tenant_id: string };
type Code = { client_id: string; redirect_uri: string; code_challenge: string; scope: string; resource: string; tenant_id: string; expires_at: number; used: boolean };
type Token = { client_id: string; scope: string; resource: string; tenant_id: string; expires_at: number };
const CODE_TTL = 5 * 60 * 1000;
const TOKEN_TTL = 3600;
const RATE_WINDOW = 15 * 60 * 1000;
const RATE_MAX = 5;
const SUPPORTED_SCOPES = ['mcp', 'mcp:read', 'mcp:write'] as const;
const DEFAULT_SCOPE = 'mcp';
const TENANT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
function allowedTenants(): Set<string> {
  return new Set((process.env.VUC_ALLOWED_TENANTS || '').split(',').map((v) => v.trim()).filter(Boolean));
}
function tenantProvisioningAllowed(tenantId: string): boolean {
  const allowed = allowedTenants();
  if (process.env.NODE_ENV === 'production' && allowed.size === 0) return false;
  return allowed.size === 0 || allowed.has(tenantId);
}
const attempts = new Map<string, { count: number; resetAt: number }>();
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const challenge = (value: string) => crypto.createHash('sha256').update(value, 'utf8').digest('base64url');
const equal = (a: string, b: string) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
function base(req: Request, configured?: string): string {
  if (configured) return configured.replace(/\/$/, '');
  const forwarded = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwarded === 'https' || req.protocol === 'https' ? 'https' : 'http';
  return `${protocol}://${req.get('host') || 'localhost:3000'}`;
}
function resource(baseUrl: string): string { return `${baseUrl.replace(/\/$/, '')}/mcp`; }
function rateLimit(ip: string): boolean {
  const now = Date.now(); const current = attempts.get(ip);
  if (!current || current.resetAt <= now) { attempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return true; }
  if (current.count >= RATE_MAX) return false;
  current.count += 1; return true;
}
const cleanup = setInterval(() => { const now = Date.now(); for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k); }, 60_000);
cleanup.unref();

export function mountOAuth(app: Express, options: { publicBaseUrl?: string } = {}): void {
  const configured = options.publicBaseUrl?.replace(/\/$/, '');
  const store = getOAuthStore();
  app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const b = base(req, configured); res.json({ resource: resource(b), authorization_servers: [b], scopes_supported: [...SUPPORTED_SCOPES], bearer_methods_supported: ['header'] });
  });
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const b = base(req, configured); res.json({ issuer: b, authorization_endpoint: `${b}/oauth/authorize`, token_endpoint: `${b}/oauth/token`, registration_endpoint: `${b}/oauth/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: [...SUPPORTED_SCOPES] });
  });
  app.post('/oauth/register', async (req, res) => {
    const { redirect_uris, client_name, tenant_id } = req.body || {};
    if (!Array.isArray(redirect_uris) || redirect_uris.length < 1 || redirect_uris.length > 20 || typeof tenant_id !== 'string' || !TENANT_RE.test(tenant_id)) return res.status(400).json({ error: 'invalid_client_metadata' });
    if (!tenantProvisioningAllowed(tenant_id)) return res.status(403).json({ error: 'tenant_not_provisioned' });
    const valid = redirect_uris.every((u: unknown) => { if (typeof u !== 'string' || u.length > 2048) return false; try { return new URL(u).protocol === 'https:'; } catch { return false; } });
    if (!valid) return res.status(400).json({ error: 'invalid_client_metadata', error_description: 'HTTPS redirect_uris required' });
    const client_id = `vua-client-${randomToken(18)}`;
    const client: Client = { client_id, redirect_uris, tenant_id, client_name: typeof client_name === 'string' ? client_name.slice(0, 200) : undefined };
    await store.saveClient(client);
    return res.status(201).json({ ...client, grant_types: ['authorization_code'], response_types: ['code'], token_endpoint_auth_method: 'none' });
  });
  app.get('/oauth/authorize', async (req, res) => {
    const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method } = req.query;
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const scope = typeof req.query.scope === 'string' ? req.query.scope : DEFAULT_SCOPE;
    const requestedScopes = scope.split(/\s+/).filter(Boolean);
    if (!requestedScopes.length || requestedScopes.some((s) => !(SUPPORTED_SCOPES as readonly string[]).includes(s))) return res.status(400).send('Unsupported scope');
    if (response_type !== 'code' || typeof client_id !== 'string' || typeof redirect_uri !== 'string' || typeof code_challenge !== 'string' || code_challenge_method !== 'S256') return res.status(400).send('Invalid OAuth authorization request');
    const client = await store.getClient(client_id);
    if (!client || !client.redirect_uris.includes(redirect_uri)) return res.status(400).send('Invalid client or redirect_uri');
    const requestedTenant = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : client.tenant_id;
    if (requestedTenant !== client.tenant_id) return res.status(403).send('Tenant mismatch');
    const expectedResource = resource(base(req, configured));
    const requestedResource = typeof req.query.resource === 'string' ? req.query.resource : '';
    if (requestedResource && requestedResource !== expectedResource) return res.status(400).send('Invalid resource');
    const hidden = (name: string, value: string) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
    return res.type('html').send(`<!doctype html><html lang="en"><body><main><h1>Authorize VUA</h1><p>Client <b>${esc(client.client_name || client_id)}</b> requests MCP access.</p><p>Scope: <code>${esc(scope)}</code></p><form method="post" action="/oauth/approve">${hidden('client_id', client_id)}${hidden('redirect_uri', redirect_uri)}${hidden('code_challenge', code_challenge)}${hidden('scope', requestedScopes.join(' '))}${hidden('tenant_id', client.tenant_id)}${hidden('resource', expectedResource)}${hidden('state', state)}<label>Authorization secret</label><input name="secret" type="password" required><button type="submit">Authorize</button></form></main></body></html>`);
  });
  app.post('/oauth/approve', async (req, res) => {
    if (!rateLimit(req.ip || 'unknown')) return res.status(429).send('Too many authorization attempts');
    const expected = process.env.OAUTH_APPROVE_SECRET;
    if (!expected) return res.status(503).send('OAuth approval is not configured');
    const { client_id, redirect_uri, code_challenge, resource: resourceValue, state, scope, tenant_id, secret } = req.body || {};
    if ([client_id, redirect_uri, code_challenge, resourceValue, secret].some((v) => typeof v !== 'string') || typeof scope !== 'string' || typeof tenant_id !== 'string') return res.status(400).send('Invalid approval request');
    if (!equal(secret, expected)) return res.status(403).send('Authorization denied');
    const client = await store.getClient(client_id); if (!client || !client.redirect_uris.includes(redirect_uri)) return res.status(400).send('Invalid client');
    const approvedScopes = scope.split(/\s+/).filter(Boolean);
    if (!approvedScopes.length || approvedScopes.some((s) => !(SUPPORTED_SCOPES as readonly string[]).includes(s)) || tenant_id !== client.tenant_id) return res.status(403).send('Tenant or scope mismatch');
    const code = randomToken(32);
    await store.saveCode(code, { client_id, redirect_uri, code_challenge, scope: approvedScopes.join(' '), resource: resourceValue, tenant_id: client.tenant_id, expires_at: Date.now() + CODE_TTL, used: false });
    const target = new URL(redirect_uri); target.searchParams.set('code', code); if (typeof state === 'string' && state) target.searchParams.set('state', state);
    return res.redirect(302, target.toString());
  });
  app.post('/oauth/token', async (req, res) => {
    const { grant_type, code, redirect_uri, client_id, code_verifier, resource: requestedResource } = req.body || {};
    if (grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });
    if ([code, redirect_uri, client_id, code_verifier].some((v) => typeof v !== 'string')) return res.status(400).json({ error: 'invalid_request' });
    const record = await store.consumeCode(code) as Code | null;
    if (!record || record.client_id !== client_id || record.redirect_uri !== redirect_uri || (typeof requestedResource === 'string' && requestedResource !== record.resource)) return res.status(400).json({ error: 'invalid_grant' });
    if (!equal(challenge(code_verifier), record.code_challenge)) return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
    const access_token = randomToken(32);
    await store.saveToken(access_token, { client_id, scope: record.scope, resource: record.resource, tenant_id: record.tenant_id, expires_at: Date.now() + TOKEN_TTL * 1000 });
    return res.json({ access_token, token_type: 'Bearer', expires_in: TOKEN_TTL, scope: record.scope, tenant_id: record.tenant_id });
  });
}

export async function validateAccessToken(token: string, expectedResource: string, expectedTenant?: string, requiredScopes: string[] = [DEFAULT_SCOPE]): Promise<{ client_id: string; scope: string; tenant_id: string } | null> {
  const store = getOAuthStore(); const record = await store.getToken(token);
  const tokenScopes = record?.scope?.split(/\s+/).filter(Boolean) || [];
  const scopeAllowed = requiredScopes.some((required) => tokenScopes.includes(required)) || (tokenScopes.includes(DEFAULT_SCOPE) && requiredScopes.length > 0);
  if (!record) return null;
  if (record.expires_at <= Date.now() || record.resource !== expectedResource || (expectedTenant !== undefined && record.tenant_id !== expectedTenant) || !scopeAllowed) return null;
  return { client_id: record.client_id, scope: record.scope, tenant_id: record.tenant_id };
}
export function oauthRequired(): boolean { if (process.env.NODE_ENV === 'production') return true; return process.env.VUA_OAUTH_REQUIRED !== 'false'; }
export function requireBearer(expectedResource: (req: Request) => string, requiredScopes: string[] = [DEFAULT_SCOPE]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!oauthRequired()) return next();
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) { const b = base(req); res.setHeader('WWW-Authenticate', `Bearer realm="vua", resource_metadata="${b}/.well-known/oauth-protected-resource"`); res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token required' }); return; }
    const token = header.slice(7).trim();
    const headerTenant = req.get('x-vuc-tenant-id')?.trim();
    if (headerTenant && !TENANT_RE.test(headerTenant)) { res.status(403).json({ error: 'tenant_invalid' }); return; }
    const principal = await validateAccessToken(token, expectedResource(req), headerTenant, requiredScopes);
    if (!principal) {
      const tokenRecord = await getOAuthStore().getToken(token);
      if (tokenRecord && tokenRecord.resource === expectedResource(req) && tokenRecord.expires_at > Date.now()) { res.status(403).json({ error: 'insufficient_scope' }); return; }
      res.status(401).json({ error: 'invalid_token' }); return;
    }
    res.locals.mcpPrincipal = principal;
    next();
  };
}
