/**
 * VUC Governance Overhead Benchmark
 *
 * Measures the VUC authorization/execution pipeline on the actual CI host.
 * It deliberately does NOT claim GPU acceleration or Bend usage unless the
 * selected execution path explicitly reports it.
 *
 * Outputs JSON + Markdown suitable for CI artifacts.
 */
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { executeVortexPipeline } from '../src/vortex/gateway.js';
import { VUABendEngine, findBendBinary } from '../src/vortex/bend-engine.js';

const WARMUP = Number(process.env.VUC_BENCH_WARMUP ?? 50);
const SAMPLES = Number(process.env.VUC_BENCH_SAMPLES ?? 1000);

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1))];
}

function bendInfo() {
  try {
    const path = './bin/native/bin/bend';
    if (!fs.existsSync(path)) return { available: false };
    const version = execFileSync(path, ['version'], { encoding: 'utf8', timeout: 5000 }).trim();
    return { available: true, version };
  } catch (error) {
    return { available: false, error: String(error) };
  }
}

async function measure() {
  const engine = process.env.VUC_BENCH_ENGINE ?? 'js';
  const bendBin = findBendBinary();
  if (engine === 'bend' && !bendBin) throw new Error('Bend benchmark requested but native Bend is unavailable.');
  if (engine === 'bend') {
    const code = 'def main() -> U32:\n  42';
    for (let i = 0; i < WARMUP; i++) VUABendEngine.execute(code);
    const latencies: number[] = [];
    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) {
      const t0 = performance.now();
      const result = VUABendEngine.execute(code);
      if (!result.success) throw new Error(`Bend execution failed at sample ${i}`);
      latencies.push(performance.now() - t0);
    }
    const totalMs = performance.now() - start;
    const cpu = process.cpuUsage();
    const cpuMs = (cpu.user + cpu.system) / 1000;
    return {
      engine: 'bend-native-hvm2',
      samples: SAMPLES,
      total_ms: Number(totalMs.toFixed(3)),
      throughput_ops_s: Number((SAMPLES / (totalMs / 1000)).toFixed(2)),
      latency_ms: {
        p50: Number(percentile(latencies, 0.50).toFixed(4)),
        p95: Number(percentile(latencies, 0.95).toFixed(4)),
        p99: Number(percentile(latencies, 0.99).toFixed(4)),
        mean: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(4)),
      },
      cpu_time_ms: Number(cpuMs.toFixed(3)),
      rss_mb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
    };
  }
  for (let i = 0; i < WARMUP; i++) {
    await executeVortexPipeline({
      request_id: `overhead-warmup-${i}`,
      operation: 'inspect',
      input: { benchmark: true, phase: 'warmup' },
    });
  }

  const latencies: number[] = [];
  const start = performance.now();

  for (let i = 0; i < SAMPLES; i++) {
    const t0 = performance.now();
    const result = await executeVortexPipeline({
      request_id: `overhead-sample-${i}`,
      operation: 'inspect',
      input: { benchmark: true, phase: 'measurement' },
    });
    const elapsed = performance.now() - t0;
    if (result.status !== 'EXECUTION_SUCCESS') {
      throw new Error(`Benchmark execution failed at sample ${i}: ${JSON.stringify(result)}`);
    }
    latencies.push(elapsed);
  }

  const totalMs = performance.now() - start;
  const cpu = process.cpuUsage();
  const cpuMs = (cpu.user + cpu.system) / 1000;

  return {
    engine: 'vuc-js-governance',
    samples: SAMPLES,
    total_ms: Number(totalMs.toFixed(3)),
    throughput_ops_s: Number((SAMPLES / (totalMs / 1000)).toFixed(2)),
    latency_ms: {
      p50: Number(percentile(latencies, 0.50).toFixed(4)),
      p95: Number(percentile(latencies, 0.95).toFixed(4)),
      p99: Number(percentile(latencies, 0.99).toFixed(4)),
      mean: Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(4)),
    },
    cpu_time_ms: Number(cpuMs.toFixed(3)),
    rss_mb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
  };
}

const result = {
  schema: 'vuc-governance-benchmark/v1',
  timestamp: new Date().toISOString(),
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cpus: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? 'unknown',
    bend: bendInfo(),
    selected_engine: process.env.VUC_BENCH_ENGINE ?? 'js',
    gpu: {
      status: process.env.VUC_GPU_RUNNER === 'true' ? 'GPU_RUNNER' : 'NOT_MEASURED',
      device: process.env.VUC_GPU_DEVICE ?? null,
      reason: process.env.VUC_GPU_RUNNER === 'true' ? 'Executed on the dedicated GPU runner; GPU acceleration is only claimed when the workload explicitly uses a GPU backend.' : 'No dedicated GPU runner selected.',
    },
  },
  measurement: await measure(),
  methodology: {
    workload: (process.env.VUC_BENCH_ENGINE ?? 'js') === 'bend' ? 'VUABendEngine.execute(native Bend/HVM2)' : 'executeVortexPipeline(operation=inspect)',
    warmup: WARMUP,
    samples: SAMPLES,
    note: 'The selected engine is explicit. Bend results only come from VUABendEngine.execute using the native Bend/HVM2 binary. GPU runner presence is reported separately and never implies GPU acceleration.',
  },
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/vuc-governance-benchmark.json', JSON.stringify(result, null, 2));
fs.writeFileSync(
  'artifacts/vuc-governance-benchmark.md',
  [
    '# VUC Governance Benchmark',
    '',
    `- Host: ${result.environment.platform}/${result.environment.arch}`,
    `- Node: ${result.environment.node}`,
    `- CPU: ${result.environment.cpu_model}`,
    `- CPUs: ${result.environment.cpus}`,
    `- Bend available: ${result.environment.bend.available ? 'yes' : 'no'}`,
    `- Bend version: ${result.environment.bend.version ?? 'n/a'}`,
    `- GPU: ${result.environment.gpu.status}`,
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Throughput | ${result.measurement.throughput_ops_s} ops/s |`,
    `| p50 | ${result.measurement.latency_ms.p50} ms |`,
    `| p95 | ${result.measurement.latency_ms.p95} ms |`,
    `| p99 | ${result.measurement.latency_ms.p99} ms |`,
    `| Mean | ${result.measurement.latency_ms.mean} ms |`,
    `| CPU time | ${result.measurement.cpu_time_ms} ms |`,
    `| RSS | ${result.measurement.rss_mb} MB |`,
    '',
    '> Bend and GPU are never inferred from mere binary availability. A benchmark path must explicitly exercise them before claiming a Bend/GPU measurement.',
  ].join('\n')
);

console.log(JSON.stringify(result, null, 2));
