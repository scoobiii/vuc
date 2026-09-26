# VUC — Vortex Universal Connector

<div align="center">

[中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Português](README.md) | [Tiếng Việt](README.vi.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Bahasa Indonesia](README.id.md) | [Malay](README.ms.md) | **English**

**Governed execution · Universal connectors · Cryptographic evidence**

</div>

---

VUC is the execution and connector layer behind the Vortex architecture. It provides a CLI, MCP integration, adapters and verification primitives for agentic workloads that need **bounded execution and independently verifiable evidence**.

> **Core principle:** proof of execution is not proof of safety.

Safety combines authorization, bounded execution, accountability, identity and independent verification.

## Architecture

```
AI / Agent
    │
    ▼
MCP / CLI
    │
    ▼
VUC
 ┌──┴──────────────────────────────┐
 │ Identity · Capability · Policy  │
 │ Connector · Execution · Proof   │
 └─────────────────────────────────┘
    │
    ▼
REAL EXECUTION
    │
    ▼
Execution Evidence
    │
    ▼
Independent Verification
```

## Naming

| Interface | Role |
|---|---|
| **Vortex** | Public product/interface name |
| **VUC** | Universal Connector and execution layer |
| **VUA** | Legacy/internal adapter and governance compatibility layer |

The current npm package remains **`@vucfoundation/vuc`** for compatibility.

## CLI

Current released package:

```bash
npx --yes @vucfoundation/vuc@1.0.1 status
```

The CLI currently supports the `vua`, `vuc` and — after the 1.0.2 release — `vortex` command aliases.

```bash
vua status
vuc status
vua adapters
vua baseline
vua conformance
vua bench --iterations 500
vua mock audit
vua repo verify
```

### Vortex command alias

The `vortex` binary is being introduced without breaking the existing `vua` and `vuc` commands:

```bash
vortex status
vua status
vuc status
```

See PR #37 for the alias change and release path.

## Platform-first execution

VUC is designed for constrained and heterogeneous environments, including Android / Termux, Alpine / Linux, ARM64, Windows, GitHub workflows and local MCP runtimes.

Capability declarations are not execution evidence. A capability is considered measured only when the workload actually executes and produces verifiable output.

## Evidence and verification

The execution model uses:

- deterministic canonicalization with RFC 8785 / JCS;
- Ed25519 identities and signatures;
- SHA-256 digests where applicable;
- explicit execution evidence;
- fail-closed policy paths;
- independent verification.

The project also exercises adversarial scenarios such as forge, replay, escalation, sandbox escape and tampering.

## Performance methodology

VUC separates **measurement from claims**.

A benchmark result is valid only for its documented workload, hardware, software version and test conditions.

Current performance work includes:

```text
CPU × Bend × GPU
A23/Termux × Cloud Run
baseline → load → peak → recovery
p50 / p95 / p99 / throughput / errors
```

The k6 degradation harness is designed to produce a machine-readable artifact rather than relying on screenshots.

## MCP

The intended governed flow is:

```text
inspect → propose → verify → execute → evidence
```

Write operations require explicit capability and authorization. Verification is separate from execution.

## Adapters

| Adapter | Environment |
|---|---|
| GitHub | repository inspection and governed Git workflows |
| Linux | POSIX / sandbox diagnostics |
| Android | Termux / Android environment diagnostics |
| Windows | Windows environment integration |

## Installation

### npm

```bash
npm install -g @vucfoundation/vuc
vua status
```

Or without a global installation:

```bash
npx --yes @vucfoundation/vuc@1.0.1 status
```

### From source

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
npm run build:cli
node dist/vua.cjs status
```

## Termux / constrained devices

Typical diagnostic flow:

```bash
df -h
free -h
node -v
npm -v

vua status
vua baseline
vua adapters
vua conformance
```

For GPU/Bend work:

```text
detected capability
      ≠
executed workload
      ≠
verified result
```

## Documentation

- [Portuguese documentation](./docs/README.md)
- [Onboarding](./docs/ONBOARDING.md)
- [Testing](./docs/TESTING.md)
- [Termux / Alpine](./docs/04-termux-e-alpine-proot.md)
- [Runtime / architecture](./docs/RUNTIME.md)

## Governance

VUC is developed around reproducible evidence, deterministic contracts and explicit authorization boundaries.

The project uses CI gates, execution evidence and verification artifacts to make technical claims auditable.

## License

MIT.
