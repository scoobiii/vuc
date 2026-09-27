# Governed CI Contract — Humans and Agents

This contract makes local development and pull-request validation use the same canonical project gate. It applies equally to humans and AI agents.

## Required semantics

- PASS satisfies a required gate.
- FAIL, SKIPPED, NEUTRAL and WARNING do not satisfy a required gate.
- Local PASS never substitutes for clean PR CI.
- PR CI runs from a clean runner against the PR SHA.
- Humans and agents use the same branch, test, evidence and merge contract.
- An agent never receives a reduced test suite because it is an agent.

## Local interface

Every governed Node project exposes:

    npm ci
    npm run ci
    npm run coverage:check

The implementation may differ by project; the interface is stable. Non-Node projects implement equivalent native commands with the same semantics.

## Reusable PR workflow

A project calls the central workflow in scoobiii/vuc:

    jobs:
      governed-ci:
        uses: scoobiii/vuc/.github/workflows/governed-ci.yml@<PINNED_SHA>

Pin the workflow to a commit SHA so the central gate cannot change silently.

## Actor model

    Human ─┐
           ├─> branch -> local CI -> PR -> clean CI -> evidence -> merge
    Agent ─┘

Actor identity is provenance, not a quality exception.

## Evidence

A governed run records repository, commit SHA, ref/PR, actor, event, CI result and coverage result.

For agent work, the executable CI remains the test oracle; the agent's self-report is not evidence of PASS.

## Coverage

100% coverage is a required project gate, but the measurement mechanism is project-specific. Each repository must define coverage:check and fail when its required threshold is not met.

The reusable workflow deliberately does not invent one coverage tool for heterogeneous repositories.

## Rollout across scoobiii

1. Adopt the local command contract.
2. Make the canonical CI deterministic.
3. Add coverage:check.
4. Add the reusable PR caller pinned to a SHA.
5. Require that check in branch protection.
6. Validate locally.
7. Open PR.
8. Require clean PR CI to PASS.
9. Merge only after all required gates PASS.

Existing project-specific tests remain authoritative for their domain. The common layer standardizes execution, evidence, actor provenance and merge gating.
