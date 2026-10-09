# VUC Architecture

> Documento canônico de arquitetura. A implementação e os testes do repositório prevalecem sobre diagramas ou descrições deste guia.

## Product boundary: Vortex, VUC and VUA

- **Vortex**: princípios, contratos e modelo de governança da execução.
- **VUC**: produto/runtime executável que oferece CLI, integrações e mecanismos de governança.
- **VUA**: nome histórico ainda presente em entry points, nomes de arquivos e aliases. Consulte [Compatibility](./COMPATIBILITY.md).

## High-level flow

```text
Agent / Host
    │ request + context
    ▼
VUC boundary
    ├── identity / principal
    ├── tenant context (where supported)
    ├── capability + scope
    ├── policy decision
    └── execution constraints / sandbox (where implemented)
            │
            ▼
      Adapter / Connector
            │
            ▼
     Local or remote operation
            │
            ▼
 result + diagnostics + evidence/proof (when produced)
            │
            ▼
 independent verification and bounded claim
```

This is a conceptual model, not a claim that every connector implements every control identically. Confirm coverage against the relevant code path and tests.

## Core concepts

| Concept | Responsibility | Important boundary |
|---|---|---|
| **Identity / principal** | Identifies the user, agent, service, or client associated with a request. | Authentication alone does not authorize an action. |
| **Tenant** | Separates logical customer/resource contexts in flows with tenant enforcement. | Tenant isolation must be verified on the specific request path. |
| **Capability** | Describes an operation that a component can expose or request. | A declared capability is not proof that it is available or authorized at runtime. |
| **Scope** | Restricts which resources or actions a principal/token can access. | A valid token with insufficient scope must not authorize the operation. |
| **Policy** | Decides whether a request satisfies configured rules and approvals. | A policy decision is distinct from the mechanism that prevents a side effect. |
| **Sandbox** | Bounds execution environment/resources where the selected path implements it. | Do not infer OS-level isolation from a label or configuration alone. |
| **Adapter** | Connects a runtime to an environment or family of operations. | Registry presence does not establish external integration success. |
| **Connector** | Mediates a protocol or interaction boundary between VUC and another system. | External effects require provider-specific evidence. |
| **ExecutionProof** | Records a defined execution claim with integrity/provenance fields and, where configured, a cryptographic signature. | A valid signature does not establish factual truth or prove an unobserved remote effect. |

## Four distinct stages

1. **Decision** — evaluate request, identity, policy, scope, and approval.
2. **Enforcement** — prevent unauthorized requests from reaching the side-effecting path.
3. **Execution** — invoke the selected local or remote operation and capture its actual result.
4. **Verification** — independently validate the evidence available for the specific claim.

A log message that says an action was allowed is not itself proof that enforcement worked. A signed result is not itself proof that the result is true. A local success does not automatically prove a remote side effect.

## Evidence-oriented status

Keep these states separate:

`DOCUMENTED ≠ IMPLEMENTED ≠ EXECUTED ≠ VERIFIED`

A capability may be documented or implemented without having been executed in a particular environment. Verification must name the claim and the evidence used.

## Implementation entry points

- CLI entry points: `bin/vuc.js`, `bin/vua.js`.
- MCP server entry point: `bin/mcp-server.js`; tool contracts also exist in `src/vortex/mcp-server.ts`.
- Adapter registry: `src/vortex/adapters/registry.ts`.
- Execution gateway and proof verification: inspect the corresponding modules under `src/vortex/`.

See [CLI](./CLI.md), [MCP](./MCP.md), [Connectors](./CONNECTORS.md), [Security](./SECURITY.md), and [Evidence](./EVIDENCE.md).
