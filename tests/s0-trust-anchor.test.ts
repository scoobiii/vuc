/**
 * Formal Acceptance & Regression Test Suite for Security Finding S0:
 * "S0 — Âncora de confiança controlada pelo chamador (Caller-Controlled Trust Anchor)"
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalize } from '../src/vortex/canonicalize.js';
import {
  KEY_REGISTRY,
  resolvePublicKey,
  sha256,
  signProofPayload,
} from '../src/vortex/crypto.js';
import { executeVortexPipeline, CURRENT_IDENTITY } from '../src/vortex/gateway.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { buildSampleExecutionDAG, signExecutionProofV2, verifyExecutionGraph } from '../src/vortex/graph-verifier.js';
import type { ExecutionProof } from '../src/vortex/types.js';

function generateUnanchoredAttackerKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function forgeMathematicallyValidProof(
  baseProof: ExecutionProof,
  attackerPrivateKeyPem: string,
  forgedKeyId: string,
  extraIdentityFields?: Record<string, unknown>
): ExecutionProof {
  const { signature: _sig, proof_hash: _hash, ...unsignedBase } = baseProof;
  const forgedUnsigned = {
    ...unsignedBase,
    request_id: `forged-req-${Date.now()}`,
    execution_id: `forged-exec-${Date.now()}`,
    agent_id: 'agent/attacker-forger',
    principal_id: 'attacker',
    operation: 'publish',
    executed: true,
    status: 'EXECUTION_SUCCESS',
    identity: {
      key_id: forgedKeyId,
      algorithm: 'Ed25519' as const,
      ...(extraIdentityFields || {}),
    },
  };
  const canonicalJcs = canonicalize(forgedUnsigned);
  const forgedProofHash = sha256(canonicalJcs);
  const forgedSignature = signProofPayload(forgedUnsigned as Record<string, unknown>, attackerPrivateKeyPem);

  return {
    ...(forgedUnsigned as Omit<ExecutionProof, 'signature' | 'proof_hash'>),
    proof_hash: forgedProofHash,
    signature: forgedSignature,
  };
}

console.log('🛡️  Executando Suíte de Aceitação e Regressão S0 (Âncora de Confiança Independente)...');
console.log('═══════════════════════════════════════════════════════════════════════════════════════');

const legitResponse = await executeVortexPipeline({
  request_id: `s0-legit-baseline-${Date.now()}`,
  operation: 'inspect',
  target: { path: '.' },
  input: { audit: 's0-baseline' },
});
assert.ok(legitResponse.execution_proof, 'Baseline execution must emit an ExecutionProof');
const legitProof = legitResponse.execution_proof;

// 1. S0 Primary Reproduction Vector: Attacker-signed proof + caller-supplied embeddedPublicKey
{
  const attacker = generateUnanchoredAttackerKeyPair();
  const forgedKeyId = `attacker-unanchored-key-${Date.now()}`;
  assert.equal(KEY_REGISTRY.has(forgedKeyId), false, 'Attacker key_id must not exist in Trust Store');

  const forgedProof = forgeMathematicallyValidProof(legitProof, attacker.privateKeyPem, forgedKeyId);

  const withCallerKey = (verifyExecutionProof as (p: ExecutionProof, o?: Record<string, unknown>) => ReturnType<typeof verifyExecutionProof>)(
    forgedProof,
    { embeddedPublicKey: attacker.publicKeyPem }
  );
  const withoutCallerKey = verifyExecutionProof(forgedProof);

  const s0ForgedAcceptedWithCallerKey = withCallerKey.valid === true;
  const forgedRejectedWithoutKey = withoutCallerKey.valid === false;

  console.log(`S0_FORGED_ACCEPTED_WITH_CALLER_KEY=${s0ForgedAcceptedWithCallerKey}`);
  console.log(`FORGED_REJECTED_WITHOUT_KEY=${forgedRejectedWithoutKey}`);

  assert.equal(
    s0ForgedAcceptedWithCallerKey,
    false,
    'S0 CRITICAL: Forged proof with caller-supplied embeddedPublicKey MUST NOT be accepted'
  );
  assert.equal(
    forgedRejectedWithoutKey,
    true,
    'Forged proof without key must be rejected'
  );
  assert.equal(withCallerKey.status, 'VERIFICATION_FAILED');
  assert.equal(
    (resolvePublicKey as (id: string, embedded?: string) => string | null)(forgedKeyId, attacker.publicKeyPem),
    null,
    'resolvePublicKey must never return an unanchored caller public key'
  );
  console.log('  ✅ [PASS] 1. Reprodução S0: embeddedPublicKey do chamador rejeitada (não-autorizante)');
}

// 2. S0 Key Substitution Vector: Attacker spoofs legitimate key_id in KEY_REGISTRY + supplies attacker embeddedPublicKey
{
  const attacker = generateUnanchoredAttackerKeyPair();
  const spoofedProof = forgeMathematicallyValidProof(
    legitProof,
    attacker.privateKeyPem,
    CURRENT_IDENTITY.key_id
  );

  const verification = (verifyExecutionProof as (p: ExecutionProof, o?: Record<string, unknown>) => ReturnType<typeof verifyExecutionProof>)(
    spoofedProof,
    { embeddedPublicKey: attacker.publicKeyPem }
  );

  assert.equal(verification.valid, false, 'Spoofed key_id with mismatched caller key must fail');
  console.log('  ✅ [PASS] 2. Substituição de chave em key_id legítimo bloqueada');
}

// 3. Inline proof.identity.public_key Injection Vector
{
  const attacker = generateUnanchoredAttackerKeyPair();
  const forgedProof = forgeMathematicallyValidProof(
    legitProof,
    attacker.privateKeyPem,
    `attacker-inline-key-${Date.now()}`,
    { public_key: attacker.publicKeyPem }
  );

  const verification = verifyExecutionProof(forgedProof);
  assert.equal(verification.valid, false, 'Inline proof.identity.public_key must not be trusted');
  console.log('  ✅ [PASS] 3. Injeção inline em proof.identity.public_key rejeitada');
}

// 4. MCP vortex.verify Caller Key Injection Vector
{
  const attacker = generateUnanchoredAttackerKeyPair();
  const forgedProof = forgeMathematicallyValidProof(
    legitProof,
    attacker.privateKeyPem,
    `attacker-mcp-key-${Date.now()}`
  );

  const mcpRes = await handleMCPMessage({
    jsonrpc: '2.0',
    id: 901,
    method: 'tools/call',
    params: {
      name: 'vortex.verify',
      arguments: {
        proof: forgedProof,
        public_key: attacker.publicKeyPem,
        embeddedPublicKey: attacker.publicKeyPem,
      },
    },
  });

  const resultObj = mcpRes.result as Record<string, any>;
  assert.equal(resultObj.status, 'VERIFICATION_FAILED', 'MCP vortex.verify must fail closed on caller key');
  assert.equal(resultObj.output.verified, false, 'MCP vortex.verify output.verified must be false');
  console.log('  ✅ [PASS] 4. MCP tools/call vortex.verify bloqueia public_key/embeddedPublicKey não ancorada');
}

// 5. ExecutionProof v2 DAG Signer Substitution Vector
{
  const sample = buildSampleExecutionDAG();
  const attacker = generateUnanchoredAttackerKeyPair();
  const clonedNodes = JSON.parse(JSON.stringify(sample.nodes));

  const { signature: _sig, ...unsignedRoot } = clonedNodes['exec-003'];
  unsignedRoot.signer = attacker.publicKeyPem;
  clonedNodes['exec-003'] = signExecutionProofV2(unsignedRoot, attacker.privateKeyPem);

  const dagResult = verifyExecutionGraph(
    clonedNodes['exec-003'],
    (id) => clonedNodes[id],
    sample.identity.publicKey
  );
  assert.equal(dagResult.valid, false, 'DAG verifier must reject node signed by untrusted signer');
  console.log('  ✅ [PASS] 5. DAG v2 verifyExecutionGraph bloqueia substituição de proof.signer');
}

// 6. Positive Independent Trust Store Verification (VUC_TRUST_STORE & KEY_REGISTRY)
{
  const legitVerif = verifyExecutionProof(legitProof);
  assert.equal(legitVerif.valid, true, 'Legitimate proof anchored in Trust Store must pass');

  const externalPartner = generateUnanchoredAttackerKeyPair();
  const partnerKeyId = `partner-pinned-key-${Date.now()}`;
  const partnerProof = forgeMathematicallyValidProof(legitProof, externalPartner.privateKeyPem, partnerKeyId);

  assert.equal(verifyExecutionProof(partnerProof).valid, false);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vuc-s0-trust-'));
  const storePath = path.join(tmpDir, 'trust-store.json');
  try {
    fs.writeFileSync(storePath, JSON.stringify({ [partnerKeyId]: externalPartner.publicKeyPem }), { mode: 0o600 });
    process.env.VUC_TRUST_STORE = storePath;
    const afterPinning = verifyExecutionProof(partnerProof);
    assert.equal(afterPinning.valid, true, 'Proof must verify after operator pins public key in VUC_TRUST_STORE');
  } finally {
    delete process.env.VUC_TRUST_STORE;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('  ✅ [PASS] 6. Trust Store independente (VUC_TRUST_STORE) valida chaves legitimamente ancoradas');
}

console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('STATUS: ✅ ENCERRAMENTO DO ACHADO S0 CONFIRMADO (6/6 TESTES DE ACEITAÇÃO APROVADOS)');
console.log('═══════════════════════════════════════════════════════════════════════════════════════');
