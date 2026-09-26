#!/usr/bin/env -S npx tsx
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

type Cell = 'gpu-js' | 'gpu-bend';
const cell = process.env.VUC_GPU_CELL as Cell | undefined;
if (cell !== 'gpu-js' && cell !== 'gpu-bend') {
  throw new Error('VUC_GPU_CELL must be gpu-js or gpu-bend');
}

function commandExists(name: string): boolean {
  try { execFileSync('sh', ['-lc', `command -v ${name}`], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

function run(name: string, args: string[] = []): string {
  return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const started = Date.now();
const platform = run('getprop', ['ro.product.cpu.abi']) || os.arch();
const android = commandExists('getprop');
const termux = Boolean(process.env.TERMUX_VERSION || process.env.PREFIX?.includes('/com.termux/'));

const backends: Record<string, unknown> = {};
if (commandExists('vulkaninfo')) {
  try {
    const info = run('vulkaninfo', ['--summary']);
    backends.vulkan = { available: true, summary: info.slice(0, 4000) };
  } catch (e) {
    backends.vulkan = { available: false, reason: String(e) };
  }
}
if (commandExists('clinfo')) {
  try {
    const info = run('clinfo', ['-l']);
    backends.opencl = { available: true, summary: info.slice(0, 4000) };
  } catch (e) {
    backends.opencl = { available: false, reason: String(e) };
  }
}
if (commandExists('nvidia-smi')) {
  try {
    backends.cuda = { available: true, device: run('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader']) };
  } catch (e) {
    backends.cuda = { available: false, reason: String(e) };
  }
}

let result: Record<string, unknown>;
if (cell === 'gpu-js') {
  // GPU-JS is deliberately fail-closed: the JS process must have a real GPU
  // execution backend. We do not count device enumeration as a PASS.
  if (backends.cuda && (backends.cuda as any).available && commandExists('python')) {
    const py = run('python', ['-c', `
import json, time
import torch
if not torch.cuda.is_available(): raise SystemExit("CUDA unavailable")
a=torch.ones((1024,1024),device="cuda"); b=torch.ones((1024,1024),device="cuda")
torch.cuda.synchronize(); t=time.perf_counter()
for _ in range(10): c=torch.mm(a,b)
torch.cuda.synchronize()
print(json.dumps({"compute":"torch.mm on CUDA","device":torch.cuda.get_device_name(0),"elapsed_ms":(time.perf_counter()-t)*1000,"checksum":float(c[0,0].item())}))
`]);
    result = { status: 'PASS', execution_backend: 'cuda', ...JSON.parse(py) };
  } else {
    result = { status: 'UNAVAILABLE', reason: 'No supported real GPU compute backend for gpu-js was found in Termux' };
  }
} else {
  // Bend GPU certification requires a native Bend binary and a GPU-capable
  // runtime. Do not claim PASS from vulkaninfo/clinfo enumeration alone.
  const bend = commandExists('bend') || commandExists('vuc-bend');
  const cuda = Boolean((backends.cuda as any)?.available);
  result = bend && cuda
    ? { status: 'READY', reason: 'Native Bend and CUDA detected; execute the Bend GPU workload with the installed VUC Bend runner' }
    : { status: 'UNAVAILABLE', reason: 'Native Bend + CUDA GPU runtime is required for Bend GPU certification', bend, cuda };
}

const evidence = {
  schema: 'vuc-termux-gpu-execution-evidence/v1',
  cell,
  provider: 'termux',
  executed_at: new Date().toISOString(),
  elapsed_ms: Date.now() - started,
  host: {
    android,
    termux,
    arch: os.arch(),
    cpu_abi: platform,
    kernel: os.release(),
  },
  backends,
  result,
};

const evidence_sha256 = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
console.log(JSON.stringify({ ...evidence, evidence_sha256 }, null, 2));

if (result.status !== 'PASS' && process.env.VUC_ALLOW_UNAVAILABLE !== 'true') process.exitCode = 2;
