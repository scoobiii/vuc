import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';
import { KEY_REGISTRY } from '../../src/vortex/crypto.js';

function sortedCanonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(sortedCanonical).join(',') + ']';
  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record).sort().map((k) => JSON.stringify(k) + ':' + sortedCanonical(record[k])).join(',') + '}';
}

DrexGovernanceEngine.resetState();
const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId: 'user-alice-pj',
  receiverId: 'user-bob-pf',
  amountRealDigital: 10_000,
  volumeTpft: 0,
  legalBasis: 'DREX P0-07 — canonical tamper',
  privacyPreserving: true,
});

const original = JSON.parse(result.canonicalJcs) as Record<string, unknown>;
const identity = KEY_REGISTRY.get('drex-bacen-mestre-key');
assert.ok(identity, 'Identidade DREX deve estar registrada.');
const publicKey = identity.public_key;

assert.equal(
  crypto.verify(null, Buffer.from(result.canonicalJcs), crypto.createPublicKey(publicKey), Buffer.from(result.ed25519Signature, 'base64')),
  true,
  'Assinatura original deve validar independentemente.',
);

for (const [field, value] of [
  ['amountRealDigital', 10_001],
  ['senderId', 'attacker'],
  ['receiverId', 'attacker'],
  ['executionHash', '0'.repeat(64)],
  ['inputHash', 'f'.repeat(64)],
  ['invariantPreserved', false],
] as const) {
  const tampered = { ...original, [field]: value };
  const tamperedJcs = sortedCanonical(tampered);
  const tamperedHash = 'sha256:' + crypto.createHash('sha256').update(tamperedJcs, 'utf8').digest('hex');

  assert.notEqual(tamperedHash, result.proofHash, field + ' deve alterar proofHash.');
  assert.equal(
    crypto.verify(null, Buffer.from(tamperedJcs), crypto.createPublicKey(publicKey), Buffer.from(result.ed25519Signature, 'base64')),
    false,
    field + ' adulterado não pode validar assinatura original.',
  );
}

console.log('PASS: P0-07 canonical JCS tampering rejected');
