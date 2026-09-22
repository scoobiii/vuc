#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const args = process.argv.slice(2).reduce((out, item, i, all) => {
  if (item.startsWith('--')) out[item.slice(2)] = all[i + 1]?.startsWith('--') ? true : all[i + 1];
  return out;
}, {});
const output = args.output;
if (!output) {
  console.error('usage: node scripts/capture-performance-metrics.mjs --output metrics.json [--profile mobile|github-vm] [--sample-size N]');
  process.exit(2);
}

const command = process.env.VUA_BENCHMARK_COMMAND ?? 'npm';
const commandArgs = process.env.VUA_BENCHMARK_ARGS ? JSON.parse(process.env.VUA_BENCHMARK_ARGS) : ['run', 'bench'];
const result = spawnSync(command, commandArgs, { encoding: 'utf8', env: process.env });
const log = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const architecture = process.arch === 'x64' ? 'x86_64' : process.arch;
const profile = args.profile ?? process.env.VORTEX_RUNNER_PROFILE ?? 'unknown';
if (!['mobile', 'github-vm', 'cloud-run'].includes(profile)) throw new Error(`unsupported profile: ${profile}`);
if (profile === 'github-vm' && process.env.GITHUB_ACTIONS !== 'true') throw new Error('github-vm capture requires GitHub Actions');
if (profile === 'mobile' && !['arm64', 'arm'].includes(architecture)) throw new Error(`mobile capture requires ARM architecture, got ${architecture}`);

function parseNumber(value) { return Number(String(value).replace(/,/g, '')); }
function finiteNonNegative(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid ${name}: ${value}`);
  return number;
}
function metricsDocument({ workload, throughput, latency, memory, sampleSize }) {
  const throughput_ops_sec = finiteNonNegative(throughput, 'throughput_ops_sec');
  const latency_us = finiteNonNegative(latency, 'latency_us');
  const memory_mb = finiteNonNegative(memory, 'memory_mb');
  const sample_size = finiteNonNegative(sampleSize, 'sample_size');
  if (!Number.isInteger(sample_size) || sample_size < 30) throw new Error(`Invalid sample_size: ${sample_size}`);
  return {
    profile,
    architecture,
    workload,
    throughput_ops_sec,
    latency_us,
    memory_mb,
    sample_size,
  };
}
function parseOfficialBench(text) {
  const total = text.match(/Total de Opera(?:ç|c)[^:]*:\s*([\d,]+)/i)?.[1];
  const duration = text.match(/Dura(?:ç|c)[^:]*:\s*([\d,.]+)\s*ms/i)?.[1];
  const throughput = text.match(/Throughput\s*:\s*([\d,.]+)\s*(?:ops|opera(?:ç|c)[^/]*)\/?seg/i)?.[1];
  const latency = text.match(/Lat(?:ê|e)ncia M(?:é|e)dia\s*:\s*([\d,.]+)\s*(?:µs|us)/i)?.[1];
  const memory = text.match(/Consumo de Mem(?:ó|o)ria\s*:\s*([\d,.]+)\s*MB/i)?.[1];
  if (!total || !duration || !throughput || !latency || !memory) return null;
  return metricsDocument({ workload: 'local-crypto', throughput: parseNumber(throughput), latency: parseNumber(latency), memory: parseNumber(memory), sampleSize: parseNumber(total) });
}
function parseStructured(text) {
  const match = text.match(/\{[\s\S]*\}/g)?.at(-1);
  if (!match) return null;
  try {
    const x = JSON.parse(match);
    if (!x.current || !Number.isFinite(Number(x.current.rps))) return null;
    const workload = x.workload ?? 'pipeline-rps';
    return metricsDocument({
      workload,
      throughput: x.current.rps,
      latency: workload === 'local-crypto' ? Number(x.current.p50_ms) * 1000 : Number(x.current.p50_ms),
      memory: x.memory_mb ?? x.current.memory_mb ?? 0,
      sampleSize: x.sampleSize,
    });
  } catch { return null; }
}
const metrics = parseStructured(log) ?? parseOfficialBench(log);
if (!metrics) {
  console.error('Benchmark produced no supported structured report. Refusing to create a baseline.');
  process.exit(result.status || 1);
}
if (result.status !== 0) {
  console.error(`Benchmark exited with code ${result.status}; refusing to create a baseline.`);
  process.exit(result.status || 1);
}
await writeFile(output, `${JSON.stringify(metrics, null, 2)}\n`);
console.log(JSON.stringify({ status: 'METRICS_CAPTURED', output, metrics }, null, 2));
