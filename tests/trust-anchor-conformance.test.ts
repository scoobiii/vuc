import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  generateVortexIdentity,
  KEY_REGISTRY,
  sha256,
  signProofPayload,
} from '../src/vortex/crypto.js';
import { canonicalize } from '../src/vortex/canonicalize.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

function makeProof(identity: ReturnType<typeof generateVortexIdentity>, requestId: string) {
  const now = new Date().toISOString();
  const unsigned: any = {
    proof_version: '1',
    request_id: requestId,
    execution_id: `exec-${requestId}`,
    runtime_id: 'trust-anchor-test',
    agent_id: identity.agent_id,
    principal_id: identity.principal_id,
    connector_id: 'connector:test',
    operation: 'inspect',
    execution_kind: 'capability',
    executed: true,
    status: 'EXECUTION_SUCCESS',
    input_hash: sha256('input'),
    output_hash: sha256('output'),
    started_at: now,
    completed_at: now,
    duration_ms: 0,
    policy_id: 'trust-anchor-test',
    policy_version: '1.0.0',
    gos3_session_id: `gos3-sess-${requestId}`,
    sandbox_id: 'sandbox-test',
    identity: { key_id: identity.key_id, algorithm: 'Ed25519' },
  };

  return {
    ...unsigned,
    signature: signProofPayload(unsigned, identity.private_key!),
    proof_hash: sha256(canonicalize(unsigned)),
  };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuc-trust-anchor-'));
const trustStore = path.join(tempDir, 'trust-store.json');

try {
  const trusted = generateVortexIdentity('trusted', 'agent/trusted', 'collision-key');
  assert.throws(() => generateVortexIdentity('attacker', 'agent/attacker', 'collision-key'), /KEY_ID_COLLISION/);

  fs.writeFileSync(
    trustStore,
    JSON.stringify({ [trusted.key_id]: trusted.public_key }),
    { mode: 0o600 },
  );

  KEY_REGISTRY.clear();

  const attacker = generateVortexIdentity('attacker', 'agent/attacker', 'attacker-key');

  const trustedProof = makeProof(trusted, 'trusted-proof');
  const trustedVerification = verifyExecutionProof(trustedProof, { trustedPublicKey: trusted.public_key });
  assert.equal(trustedVerification.valid, true, trustedVerification.reasons.join('; '));

  const noAnchorVerification = verifyExecutionProof(trustedProof);
  assert.equal(noAnchorVerification.valid, false);
  assert.match(noAnchorVerification.reasons.join('; '), /Unresolvable cryptographic identity/);

  const attackerProof = makeProof(attacker, 'attacker-proof');
  const attackerVerification = verifyExecutionProof(attackerProof, { trustedPublicKey: trusted.public_key });
  assert.equal(attackerVerification.valid, false);
  assert.match(attackerVerification.reasons.join('; '), /SIGNATURE_INVALID|Unresolvable cryptographic identity/);

  const callerKeyAttempt = (verifyExecutionProof as any)(attackerProof, {
    embeddedPublicKey: attacker.public_key,
  });
  assert.equal(callerKeyAttempt.valid, false);
  assert.match(callerKeyAttempt.reasons.join('; '), /SIGNATURE_INVALID|Unresolvable cryptographic identity/);

  console.log('S0 TRUST ANCHOR CONFORMANCE: PASS');
  console.log('trusted_key_from_external_store=PASS');
  console.log('same_key_id_collision_rejected=PASS');
  console.log('no_external_trust_anchor_rejected=PASS');
  console.log('caller_embedded_key_rejected=PASS');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
