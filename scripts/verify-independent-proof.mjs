#!/usr/bin/env node
/**
 * Independent ExecutionProof verifier.
 *
 * Trust boundary:
 * - proof.json is untrusted input
 * - trust-key.pem is the verifier's external trust anchor
 * - no VUC KEY_REGISTRY
 * - no public key from the proof/caller is accepted
 *
 * This process is intentionally separate from the executor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { canonicalize } from '../src/vortex/canonicalize.ts';
import { sha256, verifyProofSignature } from '../src/vortex/crypto.ts';

function fail(message) {
  console.error('INDEPENDENT_VERIFY=REJECT');
  console.error(message);
  process.exit(1);
}

const [proofPath, trustKeyPath] = process.argv.slice(2);
if (!proofPath || !trustKeyPath) {
  fail('usage: node scripts/verify-independent-proof.mjs <proof.json> <trusted-key.pem>');
}

const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
const trustedPublicKey = fs.readFileSync(trustKeyPath, 'utf8');
if (!trustedPublicKey.includes('PUBLIC KEY')) fail('TRUST_ANCHOR_INVALID');

if (!proof || typeof proof !== 'object') fail('PROOF_NOT_OBJECT');
if (proof.proof_version !== '1') fail('PROOF_VERSION_INVALID');
if (!proof.identity?.key_id) fail('PROOF_KEY_ID_MISSING');
if (!proof.signature) fail('PROOF_SIGNATURE_MISSING');
if (proof.executed !== true) fail('PROOF_NOT_EXECUTED');
if (!/^sha256:[0-9a-f]{64}$/.test(proof.input_hash || '')) fail('INPUT_HASH_INVALID');
if (!/^sha256:[0-9a-f]{64}$/.test(proof.output_hash || '')) fail('OUTPUT_HASH_INVALID');
if (!proof.proof_hash) fail('PROOF_HASH_MISSING');

const trustedKeyId = path.basename(trustKeyPath).replace(/\.pem$/, '');
if (trustedKeyId !== proof.identity.key_id) {
  fail(`TRUST_KEY_ID_MISMATCH expected=${trustedKeyId} proof=${proof.identity.key_id}`);
}

const { signature, proof_hash, ...unsignedProof } = proof;
const canonical = canonicalize(unsignedProof);
const recalculatedProofHash = sha256(canonical);
if (recalculatedProofHash !== proof_hash) {
  fail(`PROOF_HASH_MISMATCH expected=${recalculatedProofHash} actual=${proof.proof_hash}`);
}

if (!verifyProofSignature(unsignedProof, signature, trustedPublicKey)) {
  fail('ED25519_SIGNATURE_REJECTED');
}

const started = Date.parse(proof.started_at);
const completed = Date.parse(proof.completed_at);
if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) {
  fail('TIMESTAMP_ORDER_INVALID');
}

console.log(JSON.stringify({
  schema: 'vuc.independent-verification.v1',
  authority: 'external-trust-key-file',
  proof_key_id: proof.identity.key_id,
  trust_key_file: trustKeyPath,
  proof_hash: proof.proof_hash,
  signature: 'VALID_ED25519',
  status: 'VERIFIED',
}, null, 2));
console.log('INDEPENDENT_VERIFY=PASS');
