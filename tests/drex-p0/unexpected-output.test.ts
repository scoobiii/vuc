import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';

const invalidOutputs = ['', 'true', 'false', '1\\n2', 'NaN', '-1', 'abc', '2', ' 1 '];

for (const output of invalidOutputs) {
  const fixture = path.join(os.tmpdir(), 'drex-p0-output-' + Math.random().toString(16).slice(2) + '.sh');
  const escaped = output.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  fs.writeFileSync(fixture, '#!/usr/bin/env bash\nprintf "%s" "' + escaped + '"\n', 'utf8');
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
        legalBasis: 'DREX P0-05 — unexpected output',
        privacyPreserving: true,
      }),
      /conservation rejeitada|falhou|Bend/i,
      'Saída não canônica deve ser rejeitada: ' + JSON.stringify(output),
    );
  } finally {
    if (previous === undefined) delete process.env.BEND_BIN;
    else process.env.BEND_BIN = previous;
    fs.rmSync(fixture, { force: true });
  }

  assert.deepEqual(DrexGovernanceEngine.getAccount(senderId), senderBefore);
  assert.deepEqual(DrexGovernanceEngine.getAccount(receiverId), receiverBefore);
  assert.equal(DrexGovernanceEngine.getHistory().length, 0);
}

console.log('PASS: P0-05 unexpected Bend output rejected');
