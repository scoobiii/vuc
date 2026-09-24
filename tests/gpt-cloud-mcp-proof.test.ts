/**
 * GPT/remote MCP cloud connector acceptance contract.
 * Provider-neutral at runtime: validates the wire contract an OpenAI-compatible
 * MCP client can discover and call, then independently verifies the proof.
 */
import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const toolsResponse = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'gpt-contract-list',
  method: 'tools/list',
});

const tools = (toolsResponse.result as any).tools as any[];
const invokeTool = tools.find((tool) => tool.name === 'vua.adapter.invoke');
const inspectTool = tools.find((tool) => tool.name === 'vortex.inspect');

assert.ok(invokeTool);
assert.deepEqual(invokeTool.securitySchemes, [{ type: 'oauth2', scopes: ['mcp:write'] }]);
assert.ok(inspectTool);
assert.deepEqual(inspectTool.securitySchemes, [{ type: 'noauth' }]);

const response = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'gpt-cloud-github-read',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: 'gpt-cloud-github-read',
      adapter_id: 'github',
      action: 'inspect_repo',
      target: { owner: 'scoobiii', repo: 'vuc', branch: 'main' },
      payload: {},
      authorization: {
        principal_id: 'gpt-remote-mcp-test',
        agent_id: 'agent/gpt-cloud-connector-test',
        policy_id: 'vuc-gpt-cloud-read',
        policy_version: '1.0.0',
        capability: 'vua.github.read',
        scope: {
          repositories: ['scoobiii/vuc'],
          resources: ['vua://github/inspect_repo'],
        },
      },
    },
  },
});

assert.ok(response.result);
const result = response.result as any;
assert.equal(result.success, true);
assert.equal(result.adapter, 'github');
assert.equal(result.action, 'inspect_repo');
assert.equal(result.external_effect, 'remote_confirmed');
assert.equal(result.data.repository, 'scoobiii/vuc');
assert.ok(result.execution_proof);
assert.equal(result.execution_proof.executed, true);
assert.notEqual(result.execution_proof.signature, 'mock-sig');

const verification = verifyExecutionProof(result.execution_proof);
assert.equal(verification.valid, true, verification.reasons.join('; '));
assert.equal(verification.status, 'VERIFIED');
assert.equal(verification.checks.signature.passed, true);
assert.equal(verification.checks.identity.passed, true);
assert.equal(verification.checks.canonicalization.passed, true);
assert.equal(verification.checks.proof_hash?.passed, true);
assert.equal(verification.checks.input_hash.passed, true);
assert.equal(verification.checks.output_hash.passed, true);

console.log('GPT -> MCP -> VUC -> CLOUD -> EXECUTION PROOF: PASS');
console.log('mcp_tool_discovery=PASS');
console.log('oauth_security_scheme=PASS');
console.log('cloud_connector=github');
console.log('real_remote_read=PASS');
console.log('external_effect=remote_confirmed');
console.log('execution_proof=VERIFIED');
console.log('ed25519_signature_verified=true');
