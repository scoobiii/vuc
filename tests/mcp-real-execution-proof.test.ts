/**
 * VUC MCP -> REAL CONNECTOR -> ExecutionProof integration gate.
 *
 * Contract:
 * MCP tools/call must invoke a registered adapter through the governed
 * VUA registry, return a real ExecutionProof, and that proof must pass
 * independent Ed25519 verification before the MCP result is accepted.
 *
 * No synthetic proof, mock signature, or direct adapter invocation is allowed
 * in this test path.
 */
import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const requestId = `mcp-real-proof-${Date.now()}`;

const response = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'mcp-proof-1',
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
        principal_id: 'vuc-mcp-test',
        agent_id: 'agent/vuc-mcp-proof-test',
        policy_id: 'vuc-mcp-integration',
        policy_version: '1.0.0',
        capability: 'vua.linux.inspect',
        scope: {
          paths: ['/tmp/vua-sandbox'],
          repositories: ['local'],
        },
      },
    },
  },
});

assert.equal(response.jsonrpc, '2.0');
assert.equal(response.id, 'mcp-proof-1');
assert.ok(response.result, 'MCP call must return a result');

const result = response.result as Record<string, any>;
assert.equal(result.success, true, 'MCP adapter execution must succeed');
assert.equal(result.execution_kind, 'capability');
assert.equal(result.capability_executed, true);

const proof = result.execution_proof;
assert.ok(proof, 'MCP result must contain ExecutionProof');
assert.equal(proof.executed, true, 'Proof must state that the connector actually executed');
assert.notEqual(proof.signature, 'mock-sig', 'Synthetic mock signature is forbidden');
assert.match(proof.signature, /^[A-Za-z0-9+/]+={0,2}$/);
assert.match(proof.proof_hash, /^sha256:[a-f0-9]{64}$/);

const independent = verifyExecutionProof(proof);
assert.equal(independent.valid, true, `Independent verification failed: ${independent.reasons.join('; ')}`);
assert.equal(independent.status, 'VERIFIED');
assert.equal(independent.checks.signature.passed, true);
assert.equal(independent.checks.identity.passed, true);
assert.equal(independent.checks.canonicalization.passed, true);
assert.equal(independent.checks.proof_hash?.passed, true);
assert.equal(independent.checks.input_hash.passed, true);
assert.equal(independent.checks.output_hash.passed, true);

console.log('MCP REAL EXECUTION PROOF: PASS');
console.log(`request_id=${proof.request_id}`);
console.log(`connector_id=${proof.connector_id}`);
console.log(`operation=${proof.operation}`);
console.log(`executed=${proof.executed}`);
console.log(`key_id=${proof.identity.key_id}`);
console.log('ed25519_signature_verified=true');
console.log('proof_hash_verified=true');
console.log('external_effect=local_only');
