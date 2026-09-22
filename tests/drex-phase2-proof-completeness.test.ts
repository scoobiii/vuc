/**
 * DREX Phase 2 proof-completeness gates.
 * These tests specifically prevent synthetic/fallback execution from being
 * accepted as an ExecutionProof.
 */
import assert from 'node:assert/strict';

const { VUABendEngine, findBendBinary, readBendVersion, sha256File } = await import('../src/vortex/bend-engine.js');
const { DrexGovernanceEngine } = await import('../src/vortex/drex-engine.js');

const bend = findBendBinary();
assert.ok(bend, 'Phase 2 requires native Bend in the test environment.');
assert.equal(readBendVersion(bend!), '2.0.25');
assert.match(sha256File(bend!), /^[a-f0-9]{64}$/);

const previous = process.env.BEND_BIN;
try {
  process.env.BEND_BIN = '/definitely/missing/bend';

  assert.throws(
    () => VUABendEngine.execute('def main() -> U32:\n  1'),
    /Bend native indisponível|Bend nativo/,
    'generic Bend execution must fail closed without the native prover',
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

DrexGovernanceEngine.resetState();
const buyer = DrexGovernanceEngine.getAccount('user-bob-pf')!;
const seller = DrexGovernanceEngine.getAccount('user-alice-pj')!;
const buyerCashBefore = buyer.realDigitalBalance;
const sellerCashBefore = seller.realDigitalBalance;
const buyerEnergyBefore = buyer.energyMwhBalance ?? 0;
const sellerEnergyBefore = seller.energyMwhBalance ?? 0;

const energyResult = DrexGovernanceEngine.executeTransaction({
  operation: 'SETTLE_ENERGY_DVP',
  actorRole: 'END_USER',
  senderId: buyer.id,
  receiverId: seller.id,
  amountRealDigital: 10_000,
  volumeTpft: 0,
  energyMwh: 10,
  energyAssetId: 'ENERGY-PILOT-001',
  settlementRail: 'DREX',
  legalBasis: 'DREX Phase 2 pilot energy DvP',
  privacyPreserving: false,
});

assert.equal(energyResult.success, true);
assert.equal(energyResult.mechanicalProof?.verified, true);
assert.equal(energyResult.mechanicalProof?.engine.includes('Native Bend'), true);
assert.ok(energyResult.inputHash);
assert.ok(energyResult.executionHash);
assert.equal(DrexGovernanceEngine.getAccount(buyer.id)!.realDigitalBalance, buyerCashBefore - 10_000);
assert.equal(DrexGovernanceEngine.getAccount(seller.id)!.realDigitalBalance, sellerCashBefore + 10_000);
assert.equal(DrexGovernanceEngine.getAccount(buyer.id)!.energyMwhBalance, buyerEnergyBefore + 10);
assert.equal(DrexGovernanceEngine.getAccount(seller.id)!.energyMwhBalance, sellerEnergyBefore - 10);

console.log('PASS: Phase 2 energy DvP native proof + proof-before-mutation');
