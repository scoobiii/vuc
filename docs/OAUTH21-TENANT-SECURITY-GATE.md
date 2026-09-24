# VUC OAuth 2.1 + Tenant Security Gate

**Owner:** GoS3  
**Status:** PR #15 — implementation gate  
**Scope:** OAuth authorization-code + PKCE, resource binding, scope enforcement, tenant isolation

## Contract

VUC exposes OAuth metadata, dynamic client registration, authorization-code flow with S256 PKCE, and bearer-token validation.

Each registered client is bound to one `tenant_id`. OAuth authorization codes and access tokens persist that binding. Protected requests must provide:

`X-VUC-Tenant-ID: <tenant_id>`

The request is accepted only when the token resource, tenant and required scope all match.

## Security outcomes

| Scenario | Expected |
|---|---:|
| No bearer token | HTTP 401 |
| Invalid bearer token | HTTP 401 |
| Missing tenant context | HTTP 403 |
| Token from another tenant | HTTP 401 |
| Valid token + matching tenant + scope | HTTP 200 |
| Valid token + insufficient scope | HTTP 403 |
| Authorization code without S256 PKCE | HTTP 400 |
| Unsupported scope | HTTP 400 |
| Tenant mismatch during authorization | HTTP 403 |
| OAuth resource mismatch | HTTP 400/401 |

## Scopes

- `mcp`
- `mcp:read`
- `mcp:write`

The broad `mcp` scope is accepted by MCP endpoints that require an MCP capability. Narrow scopes can be required by individual resource routes.

## Production boundary

This PR proves protocol-level enforcement and tenant binding in the application layer. It does **not** prove:

- production identity-provider integration;
- per-customer secret/KMS lifecycle;
- external Cloud Run deployment;
- real multi-customer provisioning;
- independent security review;
- connector approval.

Dynamic registration is compatible with RFC 7591, while resource binding follows the resource-indicator model of RFC 8707.

Before external production use, tenant registration must be controlled by an organization-owned provisioning policy rather than allowing arbitrary public tenant creation.

## Verification

Run:

```bash
npm run test:security
```

The OAuth regression suite covers metadata, missing/invalid credentials, PKCE, registration, authorization, token issuance, tenant binding, cross-tenant rejection and insufficient-scope rejection.

**Signed:** GoS3