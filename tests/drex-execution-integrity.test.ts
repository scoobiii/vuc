/**
 * DREX Execution Integrity Sprint
 * Invariant: proof must be native, fail-closed, and accepted before ledger mutation.
 */
import assert from 'node:assert';
import { DrexGovernanceEngine } from '../src/vortex/drex-engine.js';
import { VUABendEngine, findBendBinary } from '../src/vortex/bend-engine.js';

const bend = findBendBinary();
assert.ok(bend, 'CI/produção deve disponibilizar o compilador Bend nativo.');

DrexGovernanceEngine.resetState();

const senderBefore = DrexGovernanceEngine.getAccount('user-alice-pj')!;
const receiverBefore = DrexGovernanceEngine.getAccount('user-bob-pf')!;
const amount = 10_000;

const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId: senderBefore.id,
  receiverId: receiverBefore.id,
  amountRealDigital: amount,
  volumeTpft: 0,
  legalBasis: 'Execution Integrity Sprint',
  privacyPreserving: true,
});

assert.equal(result.success, true);
assert.equal(result.mechanicalProof?.verified, true);
assert.equal(result.mechanicalProof?.engine.includes('Native Bend'), true);
assert.ok(result.inputHash);
assert.ok(result.executionHash);
assert.equal(result.inputHash, result.mechanicalProof?.inputHash);
assert.equal(result.executionHash, result.mechanicalProof?.executionHash);

const senderAfter = DrexGovernanceEngine.getAccount(senderBefore.id)!;
const receiverAfter = DrexGovernanceEngine.getAccount(receiverBefore.id)!;
assert.equal(senderAfter.realDigitalBalance, senderBefore.realDigitalBalance - amount);
assert.equal(receiverAfter.realDigitalBalance, receiverBefore.realDigitalBalance + amount);

assert.throws(
  () => VUABendEngine.verifyConservationInBend(
    senderBefore.realDigitalBalance,
    receiverBefore.realDigitalBalance,
    senderBefore.realDigitalBalance - amount,
    receiverBefore.realDigitalBalance + amount + 1,
  ),
  /conservation rejeitada|falhou/,
  'Bend deve rejeitar conservação adulterada antes de qualquer mutação.'
);

console.log('PASS: DREX proof-before-mutation + proof hash binding + tamper rejection');
