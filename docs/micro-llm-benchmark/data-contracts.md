# Data Contracts

## Model manifest

Required fields:

`model_id`, `parameters`, `license`, `architecture`, `format`, `quantization`, `source`, `track`.

A model is eligible for `native-500m` only when parameter count and license are verifiable and parameters <= 500M.

## Execution evidence

Required fields:

`execution_id`, `agent_id`, `runtime_id`, `sandbox_id`, `model_id`, `task_id`, `model_loaded`, `process_id`, `tokens_generated`, `exit_code`, `startup_ms`, `latency_ms`, `status`.

Proof/verification fields are required for a PASS.

## No simulated execution

Existing `simulated_metrics` may be audited, but cannot satisfy this benchmark's execution contract.
