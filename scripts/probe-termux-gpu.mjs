#!/usr/bin/env node
/**
 * VUC Termux GPU capability/evidence probe.
 *
 * This probe is deliberately conservative:
 * - device presence is not GPU execution;
 * - a GPU backend is only EXECUTABLE when its toolchain is callable;
 * - no synthetic GPU performance values are produced.
 */
import os from 'node:os';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function run(command, args = [], timeout = 3000) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: 'utf8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { available: true, output: stdout };
  } catch (error) {
    return { available: false, output: '', error: String(error).split('\n')[0] };
  }
}

function prop(name) {
  const r = run('getprop', [name]);
  return r.available ? r.output : null;
}

const isTermux = Boolean(
  process.env.TERMUX_VERSION ||
  process.env.PREFIX?.includes('com.termux') ||
  fs.existsSync('/data/data/com.termux')
);

const vulkan = run('vulkaninfo', ['--summary'], 5000);
const clinfo = run('clinfo', ['-l'], 5000);
const webgpuPackage = run('node', ['-e', "try { import('webgpu').then(()=>console.log('module:ok')).catch(()=>process.exit(1)) } catch { process.exit(1) }"], 5000);

const result = {
  schema: 'vuc-termux-gpu-probe/v1',
  timestamp: new Date().toISOString(),
  environment: {
    termux: isTermux,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cpu_model: os.cpus()[0]?.model ?? 'unknown',
    android: {
      release: prop('ro.build.version.release'),
      sdk: prop('ro.build.version.sdk'),
      hardware: prop('ro.hardware'),
      soc: prop('ro.soc.model'),
      board: prop('ro.product.board'),
      gpu_driver: prop('ro.gfx.driver.0'),
    },
  },
  backends: {
    vulkan: {
      tool: 'vulkaninfo',
      executable: vulkan.available,
      summary: vulkan.available ? vulkan.output.slice(0, 12000) : null,
    },
    opencl: {
      tool: 'clinfo',
      executable: clinfo.available,
      summary: clinfo.available ? clinfo.output.slice(0, 12000) : null,
    },
    webgpu: {
      package: 'webgpu',
      executable: webgpuPackage.available,
    },
  },
  interpretation: {
    gpu_present: Boolean(vulkan.available || clinfo.available || webgpuPackage.available),
    gpu_execution_proven: false,
    note: 'Capability discovery is not GPU execution. A benchmark must execute a GPU compute workload before reporting GPU throughput or speedup.',
  },
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/vuc-termux-gpu-probe.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
