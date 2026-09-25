# VUC — Certifiable Assurance Test Suite

## Official designation

These CI tests are officially designated as **VUC Certifiable Assurance Tests (CAT)**.

CAT tests are **audit evidence tests** designed to demonstrate implementation and operation of technical controls that may be relevant to an organization's ISO/IEC 27001 ISMS and SOC 2 control environment.

**CAT is not an ISO certificate and is not a SOC 2 report.** ISO/IEC 27001 certification is performed by an external certification body; SOC 2 is an examination of a service organization's controls against the applicable Trust Services Criteria. The VUC suite produces technical evidence that can be supplied to those processes.

## Test families

| CAT ID | Test family | Control evidence | ISO/SOC relevance |
|---|---|---|---|
| CAT-AUTH-TENANT | Tenant isolation | Principal→tenant binding; cross-tenant denial | Access control / security |
| CAT-AUTH-CAPABILITY | Capability authorization | Capability escalation denied | Access control / least privilege |
| CAT-AUTH-SCOPE | Scope enforcement | Repository/branch/path/resource widening denied | Access control / least privilege |
| CAT-AUTH-PREEXEC | Deny-before-execution | Unauthorized request produces executed=false | Preventive control operation |
| CAT-PROOF-CRYPTO | ExecutionProof | Cryptographically verifiable execution evidence | Integrity / accountability |
| CAT-PROOF-TENANT | Tenant-bound proof | Proof independently checked against expected tenant | Integrity / traceability |
| CAT-REPLAY | Anti-replay | Replayed authorization/execution request rejected | Access/session protection |
| CAT-SANDBOX | Sandbox isolation | Governed execution constrained by sandbox | System security |
| CAT-TAMPER | Evidence tamper detection | Modified proof rejected | Integrity / monitoring |
| CAT-PERF | Performance assurance | Reproducible p50/p95/p99/throughput evidence | Operational assurance |
| CAT-BEND | Runtime conformance | Explicit native Bend/HVM2 path measured | Technical assurance |
| CAT-GPU | Runtime environment evidence | Dedicated GPU host and device evidence | Technical assurance |

## Certification language

Approved terminology for CI, release notes and customer evidence:

> **VUC Certifiable Assurance Tests (CAT)** — automated technical control tests and evidence generators designed to support ISO/IEC 27001 and SOC 2 audit/assessment activities.

Do not use:

> VUC is ISO certified.

> VUC is SOC 2 certified.

> Passing CAT means ISO/SOC 2 certified.

Those statements would overstate what a software test suite establishes.

## Evidence chain

```text
Requirement / control
        ↓
VUC CAT test
        ↓
CI execution
        ↓
immutable/versioned test result
        ↓
ExecutionProof / logs / artifacts
        ↓
control evidence package
        ↓
ISO/IEC 27001 audit OR SOC 2 examination
```

## Release gate

A release may label the technical test suite **CAT PASS** only when the applicable CAT jobs pass and their evidence artifacts are retained.

CAT PASS means the tested controls passed the defined automated technical tests for that commit. It does not attest to organization-wide compliance.