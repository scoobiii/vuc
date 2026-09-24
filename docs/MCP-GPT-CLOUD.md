# GPT / Remote MCP / Cloud Connector Contract

**Owner:** VUC / Vortex Foundation  
**Responsibility:** governed remote LLM-to-cloud execution boundary  
**Version:** 1.0  
**Status:** implementation contract  
**Signature:** GoS3

## Objective

Close the first end-to-end product path:

`GPT/ChatGPT -> remote MCP -> VUC -> cloud connector -> real effect -> ExecutionProof -> independent verification`

The first cloud connector is GitHub. The acceptance path is a read-only repository inspection against the public GitHub API, so the proof is produced from a real remote response without requiring a GitHub secret.

## Acceptance contract

1. MCP client discovers `vua.adapter.invoke`.
2. Tool metadata declares OAuth for mutable adapter invocation.
3. Client invokes `github.inspect_repo` through VUC.
4. VUC applies identity, capability, scope, tenant and policy controls.
5. GitHub adapter performs a real HTTPS API read.
6. VUC emits ExecutionProof.
7. The proof is independently verified with Ed25519/JCS/hash checks.
8. The MCP response is accepted only when proof verification succeeds.

## Test

```bash
npm run test:gpt-cloud-mcp
```

Expected markers:

- `mcp_tool_discovery=PASS`
- `oauth_security_scheme=PASS`
- `cloud_connector=github`
- `real_remote_read=PASS`
- `external_effect=remote_confirmed`
- `execution_proof=VERIFIED`
- `ed25519_signature_verified=true`

## Authentication boundary

The VUC OAuth resource metadata is exposed at `/.well-known/oauth-protected-resource` and authorization-server metadata at `/.well-known/oauth-authorization-server`.

The authorization flow uses authorization-code + PKCE S256. The tenant is bound to the issued access token; a custom `X-VUC-Tenant-ID` header is optional rather than mandatory for remote MCP clients.

## Non-goals

- no deployment;
- no OpenAI API key;
- no GitHub secret committed to the repository;
- no synthetic cloud success;
- no claim that ChatGPT has been live-connected from this repository test alone.

A live external connection still requires an HTTPS-accessible VUC endpoint and the corresponding OpenAI-side MCP configuration.
