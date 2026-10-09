# VUC Connectors and Adapters

This document is the canonical overview of integration concepts. Older detailed catalogues remain available for historical context; their claims should be checked against current code and tests before being treated as current guarantees.

## Connector versus adapter

- **Connector**: mediates an interaction or protocol boundary, such as filesystem access, a governed runtime, MCP, or an LLM provider.
- **Adapter**: implements operations for a target environment/provider and is registered for discovery/invocation.

The codebase uses these terms in overlapping legacy ways. Treat the terminology above as the intended distinction, not as proof that every module follows a perfectly uniform abstraction.

## Lifecycle

```text
DISCOVERY → INTEGRATION → GOVERNED → CERTIFIED
```

This is a governance maturity model, not a claim that all integrations have reached every stage.

- **DISCOVERY** — target/capability is identified.
- **INTEGRATION** — an implementation exists.
- **GOVERNED** — relevant authorization, policy, execution constraints, and evidence controls are implemented and tested for the stated path.
- **CERTIFIED** — a defined certification gate has passed with traceable evidence. This label must name the exact scope and gate; it does not mean general product certification.

## Capability, scope and credentials

For each operation, record:

1. capability and target resource;
2. authenticated principal and tenant context, where applicable;
3. required scopes and policy/approval;
4. local versus remote side effects;
5. credentials required and their storage boundary;
6. sandbox/runtime constraints;
7. evidence emitted by the operation;
8. independent verification procedure and tests.

Credentials being configured does not prove they are valid, correctly scoped, or sufficient for a particular provider operation.

## Current integration inventory

The repository registry and documentation mention the following environments. The status below is deliberately conservative; it is not a live connectivity check.

| Integration / environment | Type | Documentation status | Evidence required for a success claim |
|---|---|---|---|
| Git / repository | Local | Implemented paths exist; inspect the selected operation | Actual command/API result, target and commit/tree state where relevant |
| GitHub | Remote | Provider-specific flows exist; availability depends on credentials, permissions and endpoint | Authenticated provider response, repository/PR identifiers and relevant base/head SHA |
| Linux | Local | Adapter/runtime paths exist; sandbox guarantees are path-specific | Exit code, stdout/stderr, timing, target and sandbox test/result |
| Android / Termux | Edge/local | Environment-dependent | Device/runtime identity and result from the exact operation |
| Windows | Local/host-dependent | Adapter paths are documented; verify support on the selected host | Actual Windows execution result and permission/sandbox evidence |
| GCloud | Remote/cloud | Environment- and credential-dependent | Real provider response, resource identity and deployment/operation state |
| Bluesky | Remote | Credential- and provider-dependent | AT Protocol response and returned post/record identity |
| Colab | Cloud/compute | Contextual/experimental until a specific workflow is verified | Workload result, runtime identity and artifact/output binding |
| Bend / DREX | Specialized compute | Specialized workflow, not a general connector guarantee | Pinned runtime, actual prover exit/output, input binding and conservation result |

Do not infer `GOVERNED` or `CERTIFIED` from a row's existence. Promote a status only when the exact operation has implementation, relevant tests, and reproducible evidence.

## Local versus remote effects

- **Local**: the target is on the executing host or its controlled runtime. Record the actual process/filesystem result and the limits of the sandbox.
- **Remote**: a provider owns the authoritative state. A local request log or generated proof cannot substitute for a provider response or independent read-back.
- **Edge/cloud compute**: record the actual device/runtime and workload; do not infer GPU or remote execution from code presence.

## Legacy catalogues

- [07 — Connectors and adapters](./07-conectores-e-adaptadores.md)
- [05 — Local adapters versus remote GitHub](./05-adapters-local-vs-github-remoto.md)

These remain linked to avoid breaking references. This file is the canonical entry point; contradictory historical claims are not guarantees without current test evidence.
