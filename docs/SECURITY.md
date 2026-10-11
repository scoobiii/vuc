# VUC Security Model

> Security claims are scoped to a particular code path, configuration, environment, and test result. This document is an entry point, not an independent security certification.

## Security boundary

The VUC boundary receives requests from agents/hosts and mediates access to operations. Model output is untrusted input. The system should distinguish identity, authorization, enforcement, execution, and verification.

## Threat model

Relevant threats include:

- forged or tampered execution evidence;
- replay of a previously authorized request;
- privilege or scope escalation;
- path traversal and sandbox escape;
- credential leakage;
- cross-tenant access;
- unsupported claims about CI, provider state, or remote effects;
- treating model output or a valid signature as factual truth.

Controls and test coverage must be evaluated against the exact implementation and runtime.

## Trust anchors and signatures

The repository implements cryptographic utilities and proof verification using Ed25519, SHA-256, and canonical JSON/JCS-related code paths. A verifier must use an independently trusted public key or trust store and the exact proof contract.

A signature establishes that a payload verifies under a key and that the signed bytes have not changed. It does not, by itself, establish that the signer was authorized, that the inputs were truthful, that the operation actually occurred, or that a claim about external state is correct.

See [Evidence](./EVIDENCE.md) for claim boundaries.

## Authorization model

Review the request's:

- authenticated principal/identity;
- tenant binding where the endpoint supports tenants;
- capability and target;
- scope and policy;
- approval binding for privileged or persistent actions;
- resource/branch/path boundaries.

Authentication is not authorization. Tool visibility is not permission. A policy decision must be enforced before the side-effecting operation, and tests should verify that denied requests do not execute.

## Sandbox and execution limits

Sandbox controls are implementation- and environment-specific. Do not infer kernel isolation from PRoot, a container label, a configured timeout, or a code-level path check. Test the actual host boundary and document residual risks.

## Credentials and zero leakage

- Do not commit API keys, PATs, private keys, access tokens, or customer secrets.
- Prefer environment variables or a dedicated secret manager appropriate to the deployment.
- Avoid printing secrets in command output, logs, proof payloads, URLs, and diagnostic bundles.
- Use least privilege and rotate/revoke credentials that may have been exposed.
- Do not claim “zero leakage” solely because a sanitizer or test exists; verify every relevant logging and transport path.

## Adversarial control families

The historical security manual names FORGE, REPLAY, ESCALATE, ESCAPE, and TAMPER. Treat them as threat/test categories, not blanket proof of complete protection. For each, link the current test, test result, environment, and residual limitations before claiming coverage.

| Threat | Desired control outcome |
|---|---|
| FORGE | Reject fabricated or unverifiable proof |
| REPLAY | Reject replay where request identity/nonce controls are implemented |
| ESCALATE | Deny unauthorized capabilities, scopes, or privileged mutations |
| ESCAPE | Prevent access outside the authorized execution boundary |
| TAMPER | Detect modifications to signed or hashed evidence |

## Tenant and OAuth

The detailed [OAuth 2.1 tenant security gate](./OAUTH21-TENANT-SECURITY-GATE.md) documents PKCE S256, token/resource binding, tenant context, and scopes. Its own production-boundary section lists what it does not prove, including production identity-provider integration and real multi-customer provisioning. Do not interpret a protocol-level test as production deployment evidence.

## Evidence and external effects

A local signed proof is not equivalent to provider-confirmed success. For remote mutations, bind the evidence to the authenticated principal, provider, action, target, relevant base/head or resource identifiers, payload hash, approval context, and actual provider response where applicable.

```text
cryptographic integrity ≠ authorization ≠ factual truth ≠ external success
```

## Known limitations and testing

- A test passing establishes only the tested behavior in that run/environment.
- Code presence is not proof of runtime isolation or provider access.
- A signed LLM output does not independently validate factual correctness.
- CI success does not certify a deployment or an external customer's environment.

Run the repository's documented security tests (for example `npm run test:security`) in the intended checkout and preserve the actual output. See [Testing](./TESTING.md), [CI status](./CI-STATUS.md), and the historical [Security Manual](./MANUAL-DE-SEGURANCA.md).
