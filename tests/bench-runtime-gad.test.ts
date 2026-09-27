import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VUAGCloudAdapter } from '../src/vortex/adapters/gcloud.js';
import { detectHardwareFingerprint } from '../src/vortex/hardware-profiler.js';

const gcloudSource = readFileSync(new URL('../src/vortex/adapters/gcloud.ts', import.meta.url), 'utf8');
const cliSource = readFileSync(new URL('../bin/vua.js', import.meta.url), 'utf8');

assert.equal(gcloudSource.includes('ais-dev-'), false, 'Cloud Run adapter não pode conter URL AI Studio fixa');
assert.equal(gcloudSource.includes('ais-pre-'), false, 'Cloud Run adapter não pode conter URL AI Studio fixa');
assert.equal(cliSource.includes('ultra-otimizado para dispositivos ARM64 / Termux / Alpine'), false, 'CLI não pode declarar hardware fixo');

const hardware = detectHardwareFingerprint();
assert.ok(hardware.platform, 'platform deve ser detectada');
assert.ok(hardware.architecture, 'architecture deve ser detectada');
assert.ok(hardware.cpuModel, 'CPU deve ser detectada');
assert.ok(hardware.cpuCores >= 1, 'CPU cores deve ser >= 1');
assert.ok(hardware.totalMemoryMB > 0, 'RAM total deve ser detectada');

const adapter = new VUAGCloudAdapter();
const probe = await adapter.executeAction('probe_endpoint', {}, {});

assert.ok(
  probe.data.diagnostic &&
  (
    String(probe.data.diagnostic).includes('DISCOVERY_REQUIRED') ||
    String(probe.data.diagnostic).includes('SUCCESS') ||
    String(probe.data.diagnostic).includes('REJECTED')
  ),
  'preflight deve reportar descoberta/validação explícita; nunca inventar endpoint',
);

if (probe.data.target_url) {
  assert.match(String(probe.data.target_url), /^https?:\/\//, 'endpoint descoberto deve ser uma URL HTTP(S)');
}

console.log('STATUS: PASS — benchmark usa hardware dinâmico e descoberta de endpoint sem URL fixa.');
