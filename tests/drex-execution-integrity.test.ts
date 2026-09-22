/**
 * DREX Execution Integrity Sprint
 * Invariant: proof must be native, fail-closed, and accepted before ledger mutation.
 */
import assert from 'node:assert';

// O teste exerce o caminho de recibo sigiloso, que exige uma chave >= 32 bytes.
// Esta chave é exclusiva do fixture e não é uma credencial de produção.
process.env.DREX_SIGILO_HMAC_KEY ??= 'drex-integrity-test-key-32-bytes-min';

const { DrexGovernanceEngine } = await import('../src/vortex/drex-engine.js');
const { VUABendEngine, findBendBinary } = await import('../src/vortex/bend-engine.js');

const bend = findBendBinary();
assert.ok(bend, 'CI/produção deve disponibilizar o compilador Bend nativo.');

DrexGovernanceEngine.resetState();

const senderBefore = DrexGovernanceEngine.getAccount('user-alice-pj')!;
const receiverBefore = DrexGovernanceEngine.getAccount('user-bob-pf')!;
const amount = 10_000;
const senderBalanceBefore = senderBefore.realDigitalBalance;
const receiverBalanceBefore = receiverBefore.realDigitalBalance;

const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId: senderBefore.id,
  receiverId: receiverBefore.id,
  amountRealDigital: amount,
  volumeTpft: 0,
  legalBasis: 'Execution Integrity Sprint',
  // Sigilo não faz parte deste gate; não exigir segredo no CI.
  privacyPreserving: false,
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
assert.equal(senderAfter.realDigitalBalance, senderBalanceBefore - amount);
assert.equal(receiverAfter.realDigitalBalance, receiverBalanceBefore + amount);

assert.throws(
  () => VUABendEngine.verifyConservationInBend(
    senderBalanceBefore,
    receiverBalanceBefore,
    senderBalanceBefore - amount,
    receiverBalanceBefore + amount + 1,
  ),
  /conservation rejeitada|falhou/,
  'Bend deve rejeitar conservação adulterada antes de qualquer mutação.'
);

console.log('PASS: DREX proof-before-mutation + proof hash binding + tamper rejection');
