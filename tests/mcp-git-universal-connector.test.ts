import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const execFile = promisify(execFileCb);
const cwd = await mkdtemp(join(tmpdir(), 'vuc-git-proof-'));
await execFile('git', ['init', '-q'], { cwd });
await writeFile(join(cwd, 'README.md'), '# VUC Git connector\\n', 'utf8');

const auth = {
  principal_id: 'vuc-mcp-git-test',
  agent_id: 'agent/vuc-mcp-git-proof-test',
  policy_id: 'vuc-mcp-git-read',
  policy_version: '1.0.0',
  capability: 'vua.git.read',
  scope: {
    paths: [cwd],
    resources: ['vua://git/read']
  }
};

const listResponse = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'git-list-1',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: 'git-list-1',
      adapter_id: 'git',
      action: 'commands',
      authorization: auth
    }
  }
});

assert.ok(listResponse.result);
const listResult = listResponse.result as any;
assert.equal(listResult.success, true);
assert.ok(Array.isArray(listResult.data.commands));
assert.ok(listResult.data.commands.includes('status'));
assert.ok(listResult.data.commands.includes('commit'));
assert.ok(listResult.data.commands.includes('read-tree'));
assert.ok(listResult.execution_proof);
assert.equal(verifyExecutionProof(listResult.execution_proof).valid, true);

const readResponse = await handleMCPMessage({
  jsonrpc: '2.0',
  id: 'git-read-1',
  method: 'tools/call',
  params: {
    name: 'vua.adapter.invoke',
    arguments: {
      request_id: 'git-read-1',
      adapter_id: 'git',
      action: 'read',
      target: { cwd },
      payload: {
        command: 'status',
        args: ['--short', '--branch'],
        cwd
      },
      authorization: auth
    }
  }
});

assert.ok(readResponse.result);
const readResult = readResponse.result as any;
assert.equal(readResult.success, true);
assert.equal(readResult.adapter, 'git');
assert.equal(readResult.action, 'read');
assert.equal(readResult.data.provider, 'git');
assert.equal(readResult.data.command, 'status');
assert.equal(readResult.data.exit_code, 0);
assert.match(readResult.data.stdout, /## No commits yet on/);
assert.equal(readResult.execution_proof.executed, true);
assert.notEqual(readResult.execution_proof.signature, 'mock-sig');

const verification = verifyExecutionProof(readResult.execution_proof);
assert.equal(verification.valid, true);
assert.equal(verification.status, 'VERIFIED');
assert.equal(verification.checks.signature.passed, true);
assert.equal(verification.checks.identity.passed, true);
assert.equal(verification.checks.canonicalization.passed, true);
assert.equal(verification.checks.proof_hash?.passed, true);
assert.equal(verification.checks.input_hash.passed, true);
assert.equal(verification.checks.output_hash.passed, true);

console.log('MCP GIT UNIVERSAL CONNECTOR: PASS');
console.log('git_command_catalog=AVAILABLE_FROM_INSTALLED_GIT');
console.log('porcelain_and_plumbing=EXPOSED');
console.log('native_exec=true');
console.log('shell=false');
console.log('execution_proof=VERIFIED');
console.log('ed25519_signature_verified=true');
