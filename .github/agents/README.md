# VUC CI Agents

The CI is divided by failure ownership. Each agent owns one class of failure and must produce evidence for that class.

| Agent | Owns |
|---|---|
| dependency | package/lockfile/install |
| native-arm64 | ARM64 native bindings |
| build | production build |
| cli | CLI artifact |
| package | npm package contract |
| test | tests/conformance |
| security | security/supply chain |
| release | evidence aggregation only |

Rule: **one failure -> one owner -> one scoped fix -> one verification**.

An agent must not repair an unrelated failure merely because it is visible in the same job.

A downstream failure does not invalidate evidence already established by an upstream agent.

A release gate is authoritative only after all mandatory agent contracts pass.
