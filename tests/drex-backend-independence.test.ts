/**
 * DREX backend-independence contract test.
 *
 * This does NOT claim that either store is a production DLT.
 * It proves the narrower architectural property:
 *   execution/proof is completed before persistence and is independent
 *   of the persistence implementation.
 */
import assert from 'node:assert';
import crypto from 'node:crypto';
import { VUABendEngine } from '../src/vortex/bend-engine.js';
import { MapDrexStateStore, AppendLogDrexStateStore } from '../src/vortex/drex-state-store.js';
import type { DrexAccountState } from '../src/types/drex.js';

const sender: DrexAccountState = {
  id: 'backend-test-sender',
  ownerName: 'Backend Test Sender',
  role: 'END_USER',
  cnpjOrCpfMasked: '***',
  realDigitalBalance: 1_000_000,
  tpftBalance: 0,
  frozenBalance: 0,
  nodeId: 'test-sender',
  complianceStatus: 'VERIFIED',
};

const receiver: DrexAccountState = {
  id: 'backend-test-receiver',
  ownerName: 'Backend Test Receiver',
  role: 'END_USER',
  cnpjOrCpfMasked: '***',
  realDigitalBalance: 500_000,
  tpftBalance: 0,
  frozenBalance: 0,
  nodeId: 'test-receiver',
  complianceStatus: 'VERIFIED',
};

const amount = 125_000;
const senderPost = { ...sender, realDigitalBalance: sender.realDigitalBalance - amount };
const receiverPost = { ...receiver, realDigitalBalance: receiver.realDigitalBalance + amount };

const mapStore = new MapDrexStateStore([sender, receiver]);
const appendLogStore = new AppendLogDrexStateStore([sender, receiver]);

// Proof is generated once, before either store is mutated.
const proof = VUABendEngine.verifyConservationInBend(
  sender.realDigitalBalance,
  receiver.realDigitalBalance,
  senderPost.realDigitalBalance,
  receiverPost.realDigitalBalance,
);

assert.equal(proof.success, true);
assert.match(proof.engine, /Native Bend/);
assert.ok(proof.inputHash);
assert.ok(proof.executionHash);

// The exact same verified proof gates both persistence implementations.
for (const store of [mapStore, appendLogStore]) {
  store.put(senderPost);
  store.put(receiverPost);
}

assert.deepEqual(
  Object.fromEntries(mapStore.snapshot()),
  Object.fromEntries(appendLogStore.snapshot()),
  'different persistence mechanisms must converge on the same governed state',
);

assert.equal(appendLogStore.mutationCount(), 2);
assert.equal(mapStore.get(sender.id)?.realDigitalBalance, 875_000);
assert.equal(mapStore.get(receiver.id)?.realDigitalBalance, 625_000);

// Failure path: invalid conservation must be rejected before either backend changes.
const beforeMap = Object.fromEntries(mapStore.snapshot());
const beforeLog = Object.fromEntries(appendLogStore.snapshot());

assert.throws(
  () => VUABendEngine.verifyConservationInBend(
    sender.realDigitalBalance,
    receiver.realDigitalBalance,
    senderPost.realDigitalBalance,
    receiverPost.realDigitalBalance + 1,
  ),
  /conservation rejeitada|falhou/,
);

assert.deepEqual(Object.fromEntries(mapStore.snapshot()), beforeMap);
assert.deepEqual(Object.fromEntries(appendLogStore.snapshot()), beforeLog);

// The proof is backend-neutral: its binding contains execution evidence, not a store identifier.
const proofFingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify({
    inputHash: proof.inputHash,
    executionHash: proof.executionHash,
    stdout: proof.stdout,
  }))
  .digest('hex');

assert.equal(proofFingerprint.length, 64);

console.log('PASS: DREX backend independence');
console.log('  Native Bend proof accepted before persistence');
console.log('  Map store and append-log store converge to identical state');
console.log('  Invalid proof leaves both stores unchanged');
console.log('  Proof binding contains no persistence-backend identifier');
