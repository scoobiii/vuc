import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const response = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'git-create-repo-contract',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: 'git-create-repo-contract',
      adapter_id: 'github',
      action: 'create_repo',
      target: { name: 'vuc-hackathon-test' },
      payload: {
        name: 'vuc-hackathon-test',
        description: 'VUC governed test repository',
        private: true,
        auto_init: true
      },
      authorization: {
        principal_id: 'vuc-git-hackathon-test',
        agent_id: 'agent/vuc-git-repo-create-test',
        policy_id: 'vuc-github-repository-write',
        policy_version: '1.0.0',
        capability: 'repository.create',
        scope: { resources: ['vua://github/repository/create'] }
      }
    }
  }
});

assert.ok(response.result);
const result = response.result as any;
assert.equal(result.adapter, 'github');
assert.equal(result.action, 'create_repo');
assert.equal(result.capability_executed, true);
assert.ok(result.execution_proof);
const verification = verifyExecutionProof(result.execution_proof);
assert.equal(verification.valid, true);
assert.equal(verification.status, 'VERIFIED');

if (process.env.GITHUB_TOKEN) {
  assert.equal(result.success, true);
  assert.equal(result.external_effect, 'remote_confirmed');
  assert.equal(result.data.provider, 'github');
  assert.match(result.data.data.repository, /vuc-hackathon-test$/);
  console.log('GITHUB CREATE REPOSITORY REAL EXECUTION: PASS');
} else {
  assert.equal(result.success, false);
  assert.equal(result.external_effect, 'none');
  assert.equal(result.data.error.code, 'CREDENTIAL_MISSING');
  console.log('GITHUB CREATE REPOSITORY FAIL-CLOSED CONTRACT: PASS');
}

console.log('execution_proof=VERIFIED');
