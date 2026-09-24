import express from 'express';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.OAUTH_STORE = 'memory';
process.env.OAUTH_APPROVE_SECRET = 'test-approval-secret';

const { mountOAuth, requireBearer } = await import('../src/vortex/oauth.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
mountOAuth(app, { publicBaseUrl: 'https://vua.example.test' });

app.post('/protected', requireBearer(() => 'https://vua.example.test/mcp', ['mcp:read']), (_req, res) => {
  res.json({ ok: true });
});
app.post('/write-protected', requireBearer(() => 'https://vua.example.test/mcp', ['mcp:write']), (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(0, '127.0.0.1');
try {
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const metadata = await fetch(`${base}/.well-known/oauth-authorization-server`);
  assert.equal(metadata.status, 200);
  const metadataBody = await metadata.json() as { scopes_supported: string[]; code_challenge_methods_supported: string[] };
  assert.deepEqual(metadataBody.scopes_supported, ['mcp', 'mcp:read', 'mcp:write']);
  assert.deepEqual(metadataBody.code_challenge_methods_supported, ['S256']);

  const protectedResource = await fetch(`${base}/.well-known/oauth-protected-resource`);
  assert.equal(protectedResource.status, 200);

  const unauthenticated = await fetch(`${base}/protected`, { method: 'POST' });
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('www-authenticate') || '', /Bearer/);

  const invalidToken = await fetch(`${base}/protected`, {
    method: 'POST',
    headers: { Authorization: 'Bearer definitely-invalid', 'X-VUC-Tenant-ID': 'tenant-a' },
  });
  assert.equal(invalidToken.status, 401);
  assert.deepEqual(await invalidToken.json(), { error: 'invalid_token' });

  const missingTenant = await fetch(`${base}/protected`, {
    method: 'POST',
    headers: { Authorization: 'Bearer definitely-invalid' },
  });
  assert.equal(missingTenant.status, 403);

  const unsupportedScope = await fetch(`${base}/oauth/authorize?response_type=code&client_id=missing&redirect_uri=https%3A%2F%2Fclient.example%2Fcallback&code_challenge=abc&code_challenge_method=S256&scope=admin`);
  assert.equal(unsupportedScope.status, 400);

  const registration = await fetch(`${base}/oauth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: ['https://client.example/callback'],
      client_name: 'VUC security test',
      tenant_id: 'tenant-a',
    }),
  });
  assert.equal(registration.status, 201);
  const client = await registration.json() as { client_id: string; tenant_id: string };
  assert.equal(client.tenant_id, 'tenant-a');

  const verifier = 'test-verifier-0123456789';
  const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url');
  const auth = new URL(`${base}/oauth/authorize`);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', client.client_id);
  auth.searchParams.set('redirect_uri', 'https://client.example/callback');
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');
  auth.searchParams.set('scope', 'mcp:read');
  auth.searchParams.set('tenant_id', 'tenant-a');

  const authorization = await fetch(auth, { redirect: 'manual' });
  assert.equal(authorization.status, 200);
  const approvalHtml = await authorization.text();
  assert.match(approvalHtml, /tenant-a/);

  const form = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: 'https://client.example/callback',
    code_challenge: challenge,
    scope: 'mcp:read',
    tenant_id: 'tenant-a',
    resource: 'https://vua.example.test/mcp',
    secret: 'test-approval-secret',
  });
  const approved = await fetch(`${base}/oauth/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    redirect: 'manual',
  });
  assert.equal(approved.status, 302);
  const location = approved.headers.get('location');
  assert(location);
  const code = new URL(location).searchParams.get('code');
  assert(code);

  const tokenResponse = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://client.example/callback',
      client_id: client.client_id,
      code_verifier: verifier,
      resource: 'https://vua.example.test/mcp',
    }),
  });
  assert.equal(tokenResponse.status, 200);
  const token = await tokenResponse.json() as { access_token: string; scope: string; tenant_id: string };
  assert.equal(token.scope, 'mcp:read');
  assert.equal(token.tenant_id, 'tenant-a');

  const valid = await fetch(`${base}/protected`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'X-VUC-Tenant-ID': 'tenant-a' },
  });
  assert.equal(valid.status, 200);

  const crossTenant = await fetch(`${base}/protected`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'X-VUC-Tenant-ID': 'tenant-b' },
  });
  assert.equal(crossTenant.status, 401);

  const insufficientScope = await fetch(`${base}/write-protected`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'X-VUC-Tenant-ID': 'tenant-a' },
  });
  assert.equal(insufficientScope.status, 403);
  assert.deepEqual(await insufficientScope.json(), { error: 'insufficient_scope' });

  console.log('OAuth 2.1 tenant/security regression tests passed.');
} finally {
  server.close();
}
