/**
 * VUC MCP Execution Conformance Gate.
 *
 * Contract covered by this test:
 *   tools/list -> tools/call -> governed connector -> ExecutionProof
 *   -> independent verification -> replay/tamper rejection.
 *
 * The test deliberately exercises the VUC MCP boundary rather than invoking
 * the adapter directly. No mock signature or synthetic success is accepted.
 */
import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { resetAntiReplayCache } from '../src/vortex/gateway.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

resetAntiReplayCache();

const toolsResponse = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'mcp-conformance-list',
  method: 'tools/list',
});

assert.equal(toolsResponse.jsonrpc, '2.0');
const tools = (toolsResponse.result as { tools: Array<Record<string, any>> }).tools;
const invokeTool = tools.find((tool) => tool.name === 'vua.adapter.invoke');

assert.ok(invokeTool, 'MCP tools/list must expose vua.adapter.invoke');
assert.deepEqual(invokeTool.securitySchemes, [{ type: 'oauth2', scopes: ['mcp:write'] }]);
assert.equal(invokeTool.inputSchema.type, 'object');

const requestId = `mcp-conformance-${Date.now()}`;
const authorization = {
  principal_id: 'vuc-mcp-conformance-test',
  agent_id: 'agent/vuc-mcp-conformance',
  policy_id: 'vuc-mcp-conformance',
  policy_version: '1.0.0',
  capability: 'vua.linux.inspect',
  scope: {
    paths: ['/tmp/vua-sandbox'],
    repositories: ['local'],
    resources: ['vua://linux/inspect_system'],
  },
};

const first = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'mcp-conformance-call-1',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: requestId,
      adapter_id: 'linux',
      action: 'inspect_system',
      target: {},
      payload: {},
      authorization,
    },
  },
});

assert.equal(first.jsonrpc, '2.0');
assert.ok(first.result);

const firstResult = first.result as Record<string, any>;
assert.equal(firstResult.success, true);
assert.equal(firstResult.execution_kind, 'capability');
assert.equal(firstResult.capability_executed, true);

const proof = firstResult.execution_proof;
assert.ok(proof);
assert.equal(proof.executed, true);
assert.notEqual(proof.signature, 'mock-sig');

const firstVerification = verifyExecutionProof(proof);
assert.equal(firstVerification.valid, true, firstVerification.reasons.join('; '));
assert.equal(firstVerification.status, 'VERIFIED');
assert.equal(firstVerification.checks.signature.passed, true);
assert.equal(firstVerification.checks.canonicalization.passed, true);
assert.equal(firstVerification.checks.proof_hash?.passed, true);
assert.equal(firstVerification.checks.input_hash.passed, true);
assert.equal(firstVerification.checks.output_hash.passed, true);

// Same request_id must never execute the connector twice.
const replay = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'mcp-conformance-replay',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: requestId,
      adapter_id: 'linux',
      action: 'inspect_system',
      target: {},
      payload: {},
      authorization,
    },
  },
});

const replayResult = replay.result as Record<string, any>;
assert.equal(replayResult.success, false);
assert.equal(replayResult.capability_executed, false);
assert.equal(replayResult.execution_proof?.executed, false);
assert.equal(replayResult.execution_proof?.status, 'REPLAY_REJECTED');
assert.equal(verifyExecutionProof(replayResult.execution_proof).valid, true);

// Any mutation of the signed proof must be rejected independently.
const tampered = {
  ...proof,
  output_hash: proof.output_hash.replace(/[0-9a-f]$/, proof.output_hash.endsWith('0') ? '1' : '0'),
};
const tamperedVerification = verifyExecutionProof(tampered);
assert.equal(tamperedVerification.valid, false);
assert.equal(tamperedVerification.status, 'VERIFICATION_FAILED');
assert.equal(tamperedVerification.checks.proof_hash?.passed, false);
assert.equal(tamperedVerification.checks.signature.passed, false);

console.log('MCP EXECUTION CONFORMANCE: PASS');
console.log('mcp_tools_list=PASS');
console.log('mcp_tools_call=PASS');
console.log('real_connector_path=PASS');
console.log('execution_proof=VERIFIED');
console.log('replay_rejection=PASS');
console.log('tamper_rejection=PASS');
console.log('synthetic_success=REJECTED');
