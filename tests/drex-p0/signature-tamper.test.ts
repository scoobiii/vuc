import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DrexGovernanceEngine } from '../../src/vortex/drex-engine.js';
import { KEY_REGISTRY } from '../../src/vortex/crypto.js';

DrexGovernanceEngine.resetState();
const result = DrexGovernanceEngine.executeTransaction({
  operation: 'TRANSFER_RETAIL',
  actorRole: 'END_USER',
  senderId: 'user-alice-pj',
  receiverId: 'user-bob-pf',
  amountRealDigital: 10_000,
  volumeTpft: 0,
  legalBasis: 'DREX P0-08 — signature tamper',
  privacyPreserving: true,
});

const identity = KEY_REGISTRY.get('drex-bacen-mestre-key');
assert.ok(identity);
const key = crypto.createPublicKey(identity.public_key);
const canonical = Buffer.from(result.canonicalJcs, 'utf8');
const original = Buffer.from(result.ed25519Signature, 'base64');

assert.equal(crypto.verify(null, canonical, key, original), true);

const altered = Buffer.from(original);
altered[0] ^= 0xff;
const truncated = original.subarray(0, original.length - 1);
const empty = Buffer.alloc(0);
const malformed = Buffer.from('not-base64-signature', 'utf8');

for (const [name, signature] of [['byte-altered', altered], ['truncated', truncated], ['empty', empty], ['malformed', malformed]] as const) {
  assert.equal(
    crypto.verify(null, canonical, key, signature),
    false,
    name + ' deve falhar.',
  );
}

const otherCanonical = canonical.toString('utf8').replace('"amountRealDigital":10000', '"amountRealDigital":10001');
assert.equal(
  crypto.verify(null, Buffer.from(otherCanonical, 'utf8'), key, original),
  false,
  'Assinatura válida não pode ser reutilizada em outro canonicalJcs.',
);

const wrongKeyPair = crypto.generateKeyPairSync('ed25519');
assert.equal(
  crypto.verify(null, canonical, wrongKeyPair.publicKey, original),
  false,
  'Chave pública incorreta deve falhar.',
);

console.log('PASS: P0-08 Ed25519 signature tampering rejected');
