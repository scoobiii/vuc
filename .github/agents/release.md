# CI Agent: release

## Mission
Aggregate evidence from all release agents. It does not repair their failures.

## Owns
- release gate aggregation
- final artifact/package evidence
- RELEASE = READY only when every mandatory gate is green

## Does not own
- speculative fixes
- weakening/removing/skipping gates
- rewriting dependency metadata to make CI green

## Contract
A mandatory failure means:

RELEASE = BLOCKED

No partial green state may be promoted to release readiness.

## Required evidence
- dependency contract
- target-platform/native contract
- production build
- CLI artifact
- package contract
- tests/conformance
- security/governance gates
