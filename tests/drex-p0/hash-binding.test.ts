import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';

const senderId = 'user-alice-pj';
const receiverId = 'user-bob-pf';
const amount = 10_000;

const lawsPath = path.resolve(process.cwd(), 'DREX_Laws.bend');
const base = fs.readFileSync(lawsPath, 'utf8');
const customMain = '\ndef main() -> U32:\n  match verify_conservation(' +
  '45000000, 2850000, 44990000, 2860000):\n' +
  '    case True{}:\n      1\n' +
  '    case False{}:\n      0\n';
const program = base.replace(/def main\\(\\) -> U32:[\\s\\S]*$/, customMain);

const independentInputHash = crypto.createHash('sha256').update(program, 'utf8').digest('hex');
assert.ok(independentInputHash.length === 64);

DrexGovernanceEngine.resetState();
const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId,
  receiverId,
  amountRealDigital: amount,
  volumeTpft: 0,
  legalBasis: 'DREX P0-06 — independent hash binding',
  privacyPreserving: true,
});

assert.equal(result.success, true);
assert.equal(result.inputHash, independentInputHash);
assert.equal(result.mechanicalProof?.inputHash, independentInputHash);
assert.match(result.canonicalJcs, /"inputHash":"[0-9a-f]{64}"/);

const canonical = JSON.parse(result.canonicalJcs) as { inputHash: string; executionHash: string };
assert.equal(canonical.inputHash, independentInputHash);

const expectedExecutionHash = crypto.createHash('sha256').update(
  JSON.stringify({ inputHash: independentInputHash, stdout: '1', exitCode: 0 }),
  'utf8',
).digest('hex');

assert.equal(result.executionHash, expectedExecutionHash);
assert.equal(result.mechanicalProof?.executionHash, expectedExecutionHash);
assert.equal(canonical.executionHash, expectedExecutionHash);

const changedProgram = program.slice(0, -1) + (program.endsWith('\\n') ? ' ' : '\\n');
const changedInputHash = crypto.createHash('sha256').update(changedProgram, 'utf8').digest('hex');
assert.notEqual(changedInputHash, independentInputHash);

const changedExecutionHash = crypto.createHash('sha256').update(
  JSON.stringify({ inputHash: changedInputHash, stdout: '1', exitCode: 0 }),
  'utf8',
).digest('hex');
assert.notEqual(changedExecutionHash, expectedExecutionHash);

const stdoutChanged = crypto.createHash('sha256').update(
  JSON.stringify({ inputHash: independentInputHash, stdout: '0', exitCode: 0 }),
  'utf8',
).digest('hex');
assert.notEqual(stdoutChanged, expectedExecutionHash);

const exitChanged = crypto.createHash('sha256').update(
  JSON.stringify({ inputHash: independentInputHash, stdout: '1', exitCode: 1 }),
  'utf8',
).digest('hex');
assert.notEqual(exitChanged, expectedExecutionHash);

console.log('PASS: P0-06 inputHash/executionHash independently bound');
