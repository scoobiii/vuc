# VUC v0.1.0-rc.1

**Status:** Release Candidate  
**Product implementation:** VUC  
**Protocol:** VUA — Vortex Universal Adapter  
**DREX prover:** Bend 2.0.25  
**Signed:** GoS3

## What is released

This RC consolidates three merged engineering sprints:

1. **PR #1 — cryptographic identity and trust**
   - Ed25519 identity/trust material.
2. **PR #2 — CI and reproducibility**
   - reproducible dependency installation and execution/quality gates.
3. **PR #3 — DREX Execution Integrity**
   - native Bend conservation proof;
   - proof-before-mutation;
   - fail-closed behavior;
   - `inputHash` and `executionHash` evidence binding.

## DREX rule

For `TRANSFER_RETAIL`:

```
validate input
    ↓
native Bend 2.0.25 verify_conservation
    ↓
accept proof
    ↓
mutate ledger
    ↓
canonicalize receipt (RFC 8785/JCS)
    ↓
derive proof hash
    ↓
Ed25519 signature
    ↓
persist audit evidence
```

There is **no arithmetic fallback**.

Bend unavailable, non-zero exit, invalid output, or rejected conservation proof means **FAIL CLOSED** and no ledger mutation.

## Scope boundary

This RC demonstrates a first implemented Execution Integrity layer for DREX flows. It does **not** claim complete Drex coverage, privacy infrastructure, external settlement interoperability, concurrency/atomicity across external systems, or regulatory certification.

## Bend 1 / Bend 2

Bend 1 and Bend 2 are different language generations. Bend 1 programs do not automatically carry over to Bend 2.

A Termux observation such as “depth 17 passes and depth 20 stalls” is a workload/device result, not a VUA correctness limit. The benchmark must identify the Bend generation, runtime target, input, hardware and memory conditions.

VUC pins **Bend 2.0.25** for the DREX native-proof path so the execution environment is reproducible.

## Release gate

Before promoting `v0.1.0-rc.1` to a stable release:

- all required CI workflows must be green;
- native Bend 2.0.25 must be executable in CI;
- DREX P0 integrity gates must pass;
- no mock/fallback path may satisfy a proof gate;
- README/spec/release metadata must agree on VUC/VUA naming and Bend version.

**GoS3**
