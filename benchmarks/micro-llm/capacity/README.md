# Micro-LLM Capacity Benchmark

## Purpose

PR #50 measures real concurrent capacity after the native-500m execution path is proven by PR #49.

Default campaign:

`N=1,2,4,6,8`

Each worker runs a real `llama-server` instance in its own VUC sandbox and must produce valid JSON plus a valid VUC MCP ExecutionProof. Synthetic tokens, latency, success or proof are never accepted.

## Measurements

For every concurrency level the campaign records:

- aggregate throughput (completion tokens/s);
- generation tokens/s;
- latency p50/p95/p99;
- startup latency;
- RSS;
- CPU;
- failures/timeouts;
- execution IDs;
- ExecutionProof pass/fail;
- per-worker evidence and logs.

The campaign repeats every N level three times by default. The value is configurable with `VUC_CAPACITY_REPETITIONS`.

## Capacity definitions

- **N_technical**: highest tested N with zero failed executions and zero invalid proofs.
- **N_sustainable**: only computed when explicit operational SLO thresholds are supplied. It requires p95 latency, RSS, error-rate and throughput-ratio constraints.
- **N_productive**: only computed when an explicit production SLA is supplied. It requires p95 latency, error-rate and minimum throughput constraints.

No N_sustainable or N_productive value is invented when an SLA/SLO has not been supplied.

## Optional SLO/SLA inputs

`VUC_MAX_P95_LATENCY_MS`

`VUC_MAX_RSS_BYTES`

`VUC_MAX_ERROR_RATE`

`VUC_MIN_THROUGHPUT_RATIO` (relative to N=1)

`VUC_PRODUCTIVE_SLA_P95_MS`

`VUC_PRODUCTIVE_MAX_ERROR_RATE`

`VUC_PRODUCTIVE_MIN_THROUGHPUT_TPS`

## Fail-closed rule

A level is not successful when any worker:

- fails to generate tokens;
- emits invalid JSON;
- lacks valid ExecutionProof;
- times out;
- exits non-zero.

The aggregate campaign fails when any tested execution fails. This preserves the distinction between measured capacity and synthetic success.
