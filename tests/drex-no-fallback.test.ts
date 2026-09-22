import assert from 'node:assert/strict';
import fs from 'node:fs';

const bendEngine = fs.readFileSync(new URL('../src/vortex/bend-engine.ts', import.meta.url), 'utf8');
const drexEngine = fs.readFileSync(new URL('../src/vortex/drex-engine.ts', import.meta.url), 'utf8');

const forbidden = [
  'VUAB Deterministic DvP Evaluator',
  'VUAB Pure HVM Engine',
  'VUAB Pure Evaluator',
  'Fallback aritmético',
  'fallback arithmetic',
];
for (const token of forbidden) {
  assert.equal(bendEngine.includes(token), false, 'DREX engine must not contain fallback token: ' + token);
  assert.equal(drexEngine.includes(token), false, 'DREX governance must not contain fallback token: ' + token);
}

assert.match(bendEngine, /Native Bend 2\.0\.25 \(HVM2\)/);
assert.match(bendEngine, /DREX DvP Bend falhou/);
assert.match(drexEngine, /SETTLE_ENERGY_DVP/);
assert.match(drexEngine, /proof\.success/);
assert.match(drexEngine, /sender\.realDigitalBalance -= price/);

console.log('PASS: static Drex no-fallback contract gate');
