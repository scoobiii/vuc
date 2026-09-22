---
name: vua-governance
description: Govern AI-agent work through VUA MCP using inspection, policy, execution proof, verification, and PR workflows.
---

# VUA Governance

Use VUA as the governance boundary for agent work.

## Required workflow

1. Inspect before acting.
2. Resolve the required capability/provider.
3. Execute only through an authorized VUA capability.
4. Require an ExecutionProof for execution claims.
5. Verify the proof independently.
6. Prepare a deterministic patch.
7. Create a pull request when a repository change is requested.
8. Do not treat model confidence as execution evidence.
9. Do not merge solely because an agent recommends merging; CI and repository governance remain authoritative.

## Core MCP tools

Prefer the VUA MCP tools exposed by the connected server, including:

- llm.query
- llm.execute
- llm.validate
- llm.summarize
- vortex.inspect
- vortex.prepare_patch
- vortex.push_branch
- vortex.create_pull_request

## Evidence rule

A model response is not proof of execution. When an operation claims to have executed, require the returned ExecutionProof and validate its cryptographic/provenance fields before treating the result as verified.

## Safety rule

Read-only inspection can precede proposal. Mutating operations require the authorization exposed by the VUA server and must remain subject to repository policy and CI.
