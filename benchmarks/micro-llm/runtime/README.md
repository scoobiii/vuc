# Real Runtime Contract

This directory intentionally does not provide a fake inference backend.

A real runner must be configured with a model runtime command and emit the execution-evidence contract. If the runtime/model is unavailable, the benchmark must return SKIPPED or BLOCKED rather than fabricating tokens, latency, RSS, proof, or success.

The VUC governance layer remains the source of authorization and verification truth.
