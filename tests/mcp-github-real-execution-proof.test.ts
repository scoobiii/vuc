/**
 * VUC MCP -> REAL CLOUD CONNECTOR -> ExecutionProof integration gate.
 *
 * Contract:
 * MCP tools/call must invoke the registered GitHub adapter against the real
 * GitHub REST API, return a real ExecutionProof, and that proof must pass
 * independent Ed25519/JCS/hash verification.
 *
 * This test is read-only:
 * - no GITHUB_TOKEN is required for the public repository read;
 * - no offline fixture is permitted;
 * - no write action is invoked;
 * - no mock signature is accepted.
 */
import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const requestId = `mcp-github-real-proof-${Date.now()}`;

const response = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'mcp-github-proof-1',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: requestId,
      adapter_id: 'github',
      action: 'inspect_repo',
      target: {
        owner: 'scoobiii',
        repo: 'vuc',
        branch: 'main',
      },
      payload: {
        owner: 'scoobiii',
        repo: 'vuc',
        branch: 'main',
      },
      authorization: {
        principal_id: 'vuc-mcp-github-test',
        agent_id: 'agent/vuc-mcp-github-proof-test',
        policy_id: 'vuc-mcp-cloud-read',
        policy_version: '1.0.0',
        capability: 'vua.github.repository.read',
        scope: {
          repositories: ['scoobiii/vuc'],
          resources: ['vua://github/inspect_repo'],
        },
      },
    },
  },
});

assert.equal(response.jsonrpc, '2.0');
assert.equal(response.id, 'mcp-github-proof-1');
assert.ok(response.result, 'MCP cloud call must return a result');

const result = response.result as Record<string, any>;
assert.equal(result.success, true, 'Real GitHub adapter execution must succeed');
assert.equal(result.adapter, 'github');
assert.equal(result.action, 'inspect_repo');
assert.equal(result.execution_kind, 'capability');
assert.equal(result.capability_executed, true);
assert.equal(result.external_effect, 'remote_confirmed');
assert.ok(result.data, 'GitHub adapter must return remote repository data');
assert.equal(result.data.repository, 'scoobiii/vuc');
assert.equal(result.data.default_branch, 'main');

const proof = result.execution_proof;
assert.ok(proof, 'Cloud MCP result must contain ExecutionProof');
assert.equal(proof.executed, true);
assert.equal(proof.connector_id, 'vua://github/inspect_repo');
assert.notEqual(proof.signature, 'mock-sig', 'Synthetic mock signature is forbidden');
assert.match(proof.signature, /^[A-Za-z0-9+/]+={0,2}$/);
assert.match(proof.proof_hash, /^sha256:[a-f0-9]{64}$/);

const independent = verifyExecutionProof(proof);
assert.equal(
  independent.valid,
  true,
  `Independent cloud proof verification failed: ${independent.reasons.join('; ')}`
);
assert.equal(independent.status, 'VERIFIED');
assert.equal(independent.checks.signature.passed, true);
assert.equal(independent.checks.identity.passed, true);
assert.equal(independent.checks.canonicalization.passed, true);
assert.equal(independent.checks.proof_hash?.passed, true);
assert.equal(independent.checks.input_hash.passed, true);
assert.equal(independent.checks.output_hash.passed, true);

console.log('MCP GITHUB REAL CLOUD EXECUTION PROOF: PASS');
console.log(`request_id=${proof.request_id}`);
console.log(`connector_id=${proof.connector_id}`);
console.log(`operation=${proof.operation}`);
console.log(`executed=${proof.executed}`);
console.log(`external_effect=${result.external_effect}`);
console.log(`key_id=${proof.identity.key_id}`);
console.log('ed25519_signature_verified=true');
console.log('proof_hash_verified=true');
console.log('remote_provider=github');
console.log('remote_operation=read_only');
