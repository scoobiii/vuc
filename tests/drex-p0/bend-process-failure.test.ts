import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';

const fixture = path.join(os.tmpdir(), 'drex-p0-bend-failure.sh');
fs.writeFileSync(fixture, '#!/usr/bin/env bash\necho "compilation error" >&2\nexit 1\n', 'utf8');
fs.chmodSync(fixture, 0o755);

DrexGovernanceEngine.resetState();
const senderId = 'user-alice-pj';
const receiverId = 'user-bob-pf';
const senderBefore = { ...DrexGovernanceEngine.getAccount(senderId)! };
const receiverBefore = { ...DrexGovernanceEngine.getAccount(receiverId)! };

const previous = process.env.BEND_BIN;
process.env.BEND_BIN = fixture;
try {
  assert.throws(
    () => DrexGovernanceEngine.executeTransaction({
      operation: 'TRANSFER_RETAIL',
      actorRole: 'END_USER',
      senderId,
      receiverId,
      amountRealDigital: 10_000,
      volumeTpft: 0,
      legalBasis: 'DREX P0-04 — Bend process failure',
      privacyPreserving: true,
    }),
    /exit 1|compilation error|Bend/i,
    'Falha do processo Bend deve ser observável e bloquear a transação.',
  );
} finally {
  if (previous === undefined) delete process.env.BEND_BIN;
  else process.env.BEND_BIN = previous;
  fs.rmSync(fixture, { force: true });
}

assert.deepEqual(DrexGovernanceEngine.getAccount(senderId), senderBefore);
assert.deepEqual(DrexGovernanceEngine.getAccount(receiverId), receiverBefore);
assert.equal(DrexGovernanceEngine.getHistory().length, 0);

console.log('PASS: P0-04 Bend process failure fails closed');
