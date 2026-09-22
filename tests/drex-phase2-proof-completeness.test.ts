/**
 * DREX Phase 2 proof-completeness gates.
 * These tests specifically prevent synthetic/fallback execution from being
 * accepted as an ExecutionProof.
 */
import assert from 'node:assert/strict';

const { VUABendEngine } = await import('../src/vortex/bend-engine.js');

const previous = process.env.BEND_BIN;
try {
  process.env.BEND_BIN = '/definitely/missing/bend';

  assert.equal(
    VUABendEngine.execute('def main() -> U32:\n  1').success,
    false,
    'placeholder',
  );
} catch (error) {
  assert.match(String(error), /Bend native indisponível|Bend nativo/);
}

try {
  assert.throws(
    () => VUABendEngine.executeDrexDvpInBend(100_000, 20_000, 50, 35_000, 10),
    /Bend nativo não encontrado/,
    'DvP must fail closed when the native prover is unavailable',
  );
} finally {
  if (previous === undefined) delete process.env.BEND_BIN;
  else process.env.BEND_BIN = previous;
}

console.log('PASS: Phase 2 native-prover fail-closed gates');
