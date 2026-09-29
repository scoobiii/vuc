# VUC Micro-LLM Benchmark Architecture

## Purpose

Measure real micro-LLM execution through the existing Vortex/VUC governance boundary without treating candidates, simulations, or metadata as executions.

## Tracks

- `native-500m`: native parameter count <= 500M.
- `large-quantized`: native parameter count > 500M, regardless of quantization.

Quantization changes weight representation/storage; it does not change native parameter count.

## Execution boundary

`LLM -> structured proposal -> Vortex -> VUC capability gate -> authorization -> sandbox -> execution -> ExecutionProof -> verification`

The model never receives direct authority to perform external effects.

## Status semantics

- PASS: required execution and evidence completed.
- FAIL: execution occurred and a required assertion failed.
- SKIPPED: execution was not attempted, with an explicit reason.
- BLOCKED: an essential dependency prevented execution.

SKIPPED/BLOCKED are never converted to PASS.

## Evidence identity

Every real execution must carry `agent_id`, `runtime_id`, `sandbox_id`, `model_id`, `task_id`, and `execution_id`.

A model counts as executed only when the runner records a real process, model-loaded signal, generated tokens, exit code 0, and a verifiable execution record.

## Capacity

Capacity tests are empirical. They start at N=1,2,4,8,12,16 and may continue under configured limits. They derive:

- N_technical: no crash/OOM/timeout;
- N_sustainable: within resource/latency SLOs;
- N_productive: above configured functional-success threshold.

GitHub Actions jobs are not counted as LLM executions unless a real model process is observed.
