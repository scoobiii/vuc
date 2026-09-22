# Bend 2 + VUA/VUC + DREX

## Architecture

```
                 VUA contract
                     │
                     │ governed execution
                     ▼
                    VUC
                     │
                     ├── MCP / adapters / policy
                     │
                     └── DREX engine
                            │
                            │ mandatory native proof
                            ▼
                      Bend 2.0.25
                            │
                            ▼
                    DREX_Laws.bend
                            │
                            ▼
                 verify_conservation(...)
                            │
                     stdout == "1"
                            │
                            ▼
                 ExecutionProof binding
```

### Separation of responsibilities

| Layer | Responsibility |
|---|---|
| VUA | Contract for governed execution and independently verifiable evidence |
| VUC | Reference implementation/product packaging |
| DREX engine | Ledger operation and receipt lifecycle |
| Bend 2.0.25 | Native mechanical prover for the DREX conservation law |
| DREX_Laws.bend | Formalized DREX invariants used by the prover |
| Ed25519/JCS | Evidence canonicalization, signing and independent verification |

Bend is therefore **not a universal VUA dependency**. It is mandatory here because the DREX `TRANSFER_RETAIL` contract explicitly selects native Bend proof as its execution-integrity mechanism.

## Bend 1 versus Bend 2

Do not mix benchmarks or source compatibility between the two generations.

- Bend 1: HVM-oriented predecessor/runtime family.
- Bend 2: current Bend language/compiler line with laws, proofs, strong typing and modern compilation/runtime targets.
- A Bend 1 recursive-depth result on Termux cannot establish a Bend 2 limit.
- VUC records the exact Bend version used for a proof-producing path.

## Fail-closed contract

The following conditions reject `TRANSFER_RETAIL`:

- Bend binary unavailable;
- wrong pinned Bend version;
- `DREX_Laws.bend` unavailable;
- process execution error;
- non-zero process exit;
- non-canonical proof output;
- conservation proof evaluates false.

A failed prover is never converted into a successful arithmetic calculation.

## Evidence contract

A successful DREX proof exposes:

- `inputHash`;
- `executionHash`;
- canonical JCS receipt;
- Ed25519 signature.

The proof must bind to the actual prover input and execution result; it is not a decorative `verified=true` flag.

**GoS3**
