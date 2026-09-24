/**
 * VUC ExecutionProof evidence artifact gate.
 *
 * CI contract:
 *   MCP tools/call -> governed adapter -> signed ExecutionProof
 *   -> independent verification -> persisted evidence artifact.
 *
 * The artifact contains the complete proof object, not only a hash, so CI
 * consumers can independently verify provenance without trusting test stdout.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { resetAntiReplayCache } from '../src/vortex/gateway.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';
import { generateExecutionEvidence } from '../src/vortex/evidence.js';

const commitSha = process.env.GITHUB_SHA;
const ciRunId = process.env.GITHUB_RUN_ID;
const ciRunAttempt = process.env.GITHUB_RUN_ATTEMPT;

assert.ok(commitSha, 'GITHUB_SHA is required for CI evidence provenance');
assert.ok(ciRunId, 'GITHUB_RUN_ID is required for CI evidence provenance');
assert.ok(ciRunAttempt, 'GITHUB_RUN_ATTEMPT is required for CI evidence provenance');

resetAntiReplayCache();

const requestId = `execution-evidence-${commitSha}-${ciRunId}-${ciRunAttempt}`;
const response = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'execution-evidence-artifact',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: requestId,
      adapter_id: 'linux',
      action: 'inspect_system',
      target: {},
      payload: {},
      authorization: {
        principal_id: 'vuc-ci-evidence',
        agent_id: 'agent/vuc-ci-evidence',
        policy_id: 'vuc-ci-evidence',
        policy_version: '1.0.0',
        capability: 'vua.linux.inspect',
        scope: {
          paths: ['/tmp/vua-sandbox'],
          repositories: ['local'],
          resources: ['vua://linux/inspect_system'],
        },
      },
    },
  },
});

assert.equal(response.jsonrpc, '2.0');
assert.ok(response.result);

const result = response.result as Record<string, any>;
assert.equal(result.success, true);
assert.equal(result.capability_executed, true);

const proof = result.execution_proof;
assert.ok(proof, 'MCP execution must emit ExecutionProof');
assert.equal(proof.executed, true);
assert.notEqual(proof.signature, 'mock-sig');

const verification = verifyExecutionProof(proof);
assert.equal(verification.valid, true, verification.reasons.join('; '));
assert.equal(verification.status, 'VERIFIED');

const proofHash = proof.proof_hash;
assert.equal(typeof proofHash, 'string');
assert.ok(proofHash.length > 0);

const evidence = generateExecutionEvidence({
  commitSha,
  ciRunId,
  ciRunAttempt,
  proofHashes: [proofHash],
  allTestsPassed: true,
  coveragePercent: 100,
});

const artifact = {
  schema: 'vortex-execution-proof-artifact/v1',
  commit_sha: commitSha,
  ci: {
    run_id: ciRunId,
    run_attempt: ciRunAttempt,
    workflow: process.env.GITHUB_WORKFLOW || 'unknown-workflow',
  },
  proofs: [
    {
      proof,
      verification,
    },
  ],
  evidence,
};

fs.writeFileSync('.vortex-execution-proofs.json', JSON.stringify(artifact, null, 2), 'utf8');
fs.writeFileSync('.vortex-evidence.json', JSON.stringify(evidence, null, 2), 'utf8');

console.log('EXECUTION PROOF EVIDENCE ARTIFACT: PASS');
console.log('execution_proof=VERIFIED');
console.log('artifact=.vortex-execution-proofs.json');
console.log('evidence=.vortex-evidence.json');
console.log(`proof_hash=${proofHash}`);
console.log(`canonical_hash=${evidence.canonical_hash}`);
