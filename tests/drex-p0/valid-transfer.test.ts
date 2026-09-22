import assert from 'node:assert/strict';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';
import { findBendBinary } from '../../src/vortex/bend-engine.js';

const senderId = 'user-alice-pj';
const receiverId = 'user-bob-pf';
const amountRealDigital = 10_000;

function requiredAccount(id: string) {
  const account = DrexGovernanceEngine.getAccount(id);
  assert.ok(account, `Conta DREX esperada não encontrada: ${id}`);
  return account;
}

assert.ok(findBendBinary(), 'P0-01 requer o compilador Bend nativo instalado e executável no CI.');
DrexGovernanceEngine.resetState();

const senderBefore = requiredAccount(senderId);
const receiverBefore = requiredAccount(receiverId);
const senderBalanceBefore = senderBefore.realDigitalBalance;
const receiverBalanceBefore = receiverBefore.realDigitalBalance;
const totalBefore = senderBalanceBefore + receiverBalanceBefore;

assert.ok(senderBalanceBefore >= amountRealDigital);

const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId,
  receiverId,
  amountRealDigital,
  volumeTpft: 0,
  legalBasis: 'DREX P0-01 — valid transfer',
  privacyPreserving: true,
});

assert.equal(result.success, true);
assert.equal(result.mechanicalProof?.verified, true);
assert.match(result.mechanicalProof?.engine ?? '', /Native Bend/i);
assert.deepEqual(result.mechanicalProof?.verifiedLaws, ['verify_conservation']);
assert.equal(typeof result.inputHash, 'string');
assert.equal(typeof result.executionHash, 'string');
assert.equal(result.inputHash, result.mechanicalProof?.inputHash);
assert.equal(result.executionHash, result.mechanicalProof?.executionHash);

const senderAfter = requiredAccount(senderId);
const receiverAfter = requiredAccount(receiverId);
assert.equal(senderAfter.realDigitalBalance, senderBalanceBefore - amountRealDigital);
assert.equal(receiverAfter.realDigitalBalance, receiverBalanceBefore + amountRealDigital);
assert.equal(senderAfter.realDigitalBalance + receiverAfter.realDigitalBalance, totalBefore);
assert.equal(result.invariantPreserved, true);
assert.equal(result.balancePreSum, result.balancePostSum);
assert.ok(result.transactionId);
assert.ok(result.canonicalJcs);
assert.ok(result.proofHash);
assert.ok(result.ed25519Signature);
assert.equal(DrexGovernanceEngine.getHistory().length, 1);

console.log('PASS: P0-01 valid transfer uses native Bend');
