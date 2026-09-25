# VUC Performance Matrix

## Purpose

The CI measures four explicit runtime cells:

| Cell | Host | Engine | What it proves |
|---|---|---|---|
| CPU-JS | GitHub-hosted CPU | VUC JS/TS governance | CPU baseline |
| CPU-Bend | GitHub-hosted CPU | native Bend/HVM2 | explicit Bend path |
| GPU-JS | self-hosted NVIDIA GPU | VUC JS/TS governance | governance measured on GPU host |
| GPU-Bend | self-hosted NVIDIA GPU | native Bend/HVM2 | Bend measured on GPU host |

Each cell records p50/p95/p99, mean latency, throughput, CPU time and RSS.

## Important interpretation

A GPU runner does **not** by itself mean that VUC is GPU-accelerated.

The current matrix intentionally separates:

1. **GPU hardware availability** — verified with `nvidia-smi`.
2. **VUC governance execution** — measured by `executeVortexPipeline`.
3. **Bend execution** — measured only through `VUABendEngine.execute`, which invokes the native Bend/HVM2 binary.
4. **GPU backend execution** — NOT claimed until a VUC workload explicitly invokes a GPU backend.

Therefore GPU-JS and GPU-Bend answer:

> What is the measured VUC/Bend runtime when the process is hosted on an NVIDIA GPU machine?

They do not answer how much faster VUC is because it used the GPU. That second claim requires a real GPU execution backend integrated into the benchmarked workload.

## Required self-hosted runner labels

Register a dedicated runner with labels: `self-hosted`, `linux`, `x64`, `gpu`, `nvidia`.

The runner must provide: NVIDIA GPU, compatible NVIDIA driver, `nvidia-smi`, Node.js 22, network access to GitHub Actions, and enough CPU/RAM for reproducible benchmark runs.

The workflow fails closed if `nvidia-smi` is unavailable.

## Bend instrumentation

The Bend cell is not inferred from binary presence.

The benchmark explicitly selects `VUC_BENCH_ENGINE=bend` and executes `VUABendEngine.execute(...)`, which requires the repository's native Bend/HVM2 binary.

## Evidence

Each matrix cell publishes `artifacts/vuc-governance-benchmark.json` and `artifacts/vuc-governance-benchmark.md`. GPU cells additionally publish `artifacts/gpu-device.csv`. These artifacts are the source of truth for performance comparisons.

## Next stage

To measure actual GPU acceleration, add a concrete GPU backend and benchmark the same workload in: `direct CPU → direct GPU → VUC+CPU → VUC+GPU`. Only then should CI calculate GPU speedup and VUC GPU overhead.