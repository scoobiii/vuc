import assert from 'node:assert/strict';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';

const senderId = 'user-alice-pj';
const receiverId = 'user-bob-pf';
const amountRealDigital = 10_000;

DrexGovernanceEngine.resetState();
const senderBefore = { ...DrexGovernanceEngine.getAccount(senderId)! };
const receiverBefore = { ...DrexGovernanceEngine.getAccount(receiverId)! };

process.env.BEND_BIN = process.env.BEND_BIN || '/bin/false';

assert.throws(
  () => DrexGovernanceEngine.executeTransaction({
    operation: 'TRANSFER_RETAIL',
    actorRole: 'END_USER',
    senderId,
    receiverId,
    amountRealDigital,
    volumeTpft: 0,
    legalBasis: 'DREX P0-02 — invalid conservation',
    privacyPreserving: true,
  }),
  /conservação Bend não verificada|conservation rejeitada|Bend/i,
  'Prova de conservação inválida deve bloquear o fluxo transacional.',
);

const senderAfter = DrexGovernanceEngine.getAccount(senderId)!;
const receiverAfter = DrexGovernanceEngine.getAccount(receiverId)!;

assert.deepEqual(senderAfter, senderBefore, 'Falha de prova não pode alterar o remetente.');
assert.deepEqual(receiverAfter, receiverBefore, 'Falha de prova não pode alterar o destinatário.');
assert.equal(DrexGovernanceEngine.getHistory().length, 0, 'Falha não pode persistir recibo de sucesso.');

assert.equal(amountRealDigital, 10_000);
console.log('PASS: P0-02 invalid conservation leaves ledger unchanged');
