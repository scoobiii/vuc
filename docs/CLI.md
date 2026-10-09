# VUC CLI

This guide documents the repository's CLI entry points and the published package contract. Output and supported options can vary by version; use `vuc --help` or the matching source for the installed version.

## Install

Published package name: `@vucfoundation/vuc`. The repository's `package.json` declares version `1.0.2` at the time this guide was written.

```bash
npm install -g @vucfoundation/vuc@1.0.2
vuc --version
```

For development in a checkout:

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
npm run build:cli
npm run test:cli
```

The source entry point can also be invoked through npm scripts, for example `npm run vua -- status`. Follow [Onboarding](./ONBOARDING.md) for the broader local workflow.

## First inspection

```bash
vuc --version
vuc status
vuc adapters
vuc conformance
vuc repo inspect
```

- `status`: reports detected environment/runtime information.
- `adapters`: lists adapters registered in the current runtime.
- `conformance`: runs the adapter conformance path implemented by this version.
- `repo inspect`: inspects repository governance state without intentionally modifying it.

These commands are observations of the current environment; they are not a blanket production-readiness certification.

## Other commands present in the CLI

The CLI help in `bin/vuc.js` also documents `baseline`, `invoke`, `bench`, `gcloud`, `llm`, `bluesky`, `mcp`, `verify`, `mock`, and repository subcommands `bootstrap`, `verify`, and `repair`. Read the installed version's help before automation, especially for commands that can write, publish, invoke a provider, or alter repository configuration.

### Verify a proof

The source CLI help documents:

```bash
vuc verify proof.json
```

Use a proof file from a real execution. Verification validates the supported proof contract; it does not prove the truth of arbitrary statements embedded in the output. See [Evidence](./EVIDENCE.md).

### Start the local MCP server

```bash
vuc mcp
```

The documented local entry point is MCP over stdio. It is intended to be launched by an MCP host, not treated as an interactive shell command. See [MCP](./MCP.md).

## Names and aliases

The package maps `vuc`, `vua`, and `vortex` to `dist/vua.cjs`. The implementation still contains historical VUA naming. New documentation should use VUC as the canonical product name. See [Compatibility](./COMPATIBILITY.md).

## Output and status semantics

CLI commands do not all share one universal machine-readable output schema. Do not assume that every command supports JSON unless its help/source explicitly says so. For automation, check the command's exit status, parse only a documented output format, preserve stderr, and fail closed on missing or ambiguous evidence.

The following words are useful as *claim labels*, but are not asserted here as a universal CLI enum:

| Label | Interpretation |
|---|---|
| `PASS` | A specific gate ran and passed. |
| `FAIL` | A specific gate ran and failed. |
| `UNKNOWN` | Available evidence is insufficient to decide. |
| `VERIFIED` | A named claim was independently checked against its stated verification rules. |
| `BLOCKED` | The operation was prevented or cannot proceed under current conditions; verify the actual result rather than infer it from prose. |

Never map a missing result or parser error to `PASS`.

## Automation example

```bash
#!/usr/bin/env bash
set -euo pipefail

vuc --version
vuc status
vuc adapters
vuc conformance
```

This example stops on a non-zero exit status. It does not make the human-readable output a machine-verifiable attestation.

## Error handling

Use the exit code and diagnostics from the exact command/version. This guide does not define a global numeric error-code table because one is not established by the inspected CLI contract. For sensitive or external-effecting operations, missing credentials, approval, target, or verifiable result must not be treated as success.
