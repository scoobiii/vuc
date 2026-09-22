import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';

const senderId = 'user-alice-pj';
const receiverId = 'user-bob-pf';

DrexGovernanceEngine.resetState();
const senderBefore = { ...DrexGovernanceEngine.getAccount(senderId)! };
const receiverBefore = { ...DrexGovernanceEngine.getAccount(receiverId)! };

const missing = path.join(process.cwd(), 'bin', 'native', 'bin', 'bend.missing-p0-03');
assert.equal(fs.existsSync(missing), false, 'Fixture de ausência do Bend não pode existir.');

const previous = process.env.BEND_BIN;
process.env.BEND_BIN = missing;
try {
  assert.throws(
    () => DrexGovernanceEngine.executeTransaction({
      operation: 'TRANSFER_RETAIL',
      actorRole: 'END_USER',
      senderId,
      receiverId,
      amountRealDigital: 10_000,
      volumeTpft: 0,
      legalBasis: 'DREX P0-03 — Bend ausente',
      privacyPreserving: true,
    }),
    /Bend nativo não encontrado/i,
    'Bend ausente deve falhar fechado.',
  );
} finally {
  if (previous === undefined) delete process.env.BEND_BIN;
  else process.env.BEND_BIN = previous;
}

assert.deepEqual(DrexGovernanceEngine.getAccount(senderId), senderBefore);
assert.deepEqual(DrexGovernanceEngine.getAccount(receiverId), receiverBefore);
assert.equal(DrexGovernanceEngine.getHistory().length, 0);

console.log('PASS: P0-03 missing Bend fails closed without fallback');
