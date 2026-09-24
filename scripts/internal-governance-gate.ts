import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { executeVortexPipeline } from '../src/vortex/gateway.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';
import { loadGovernanceSystemInstruction } from '../src/vortex/governance-instruction.js';
import { generateVortexIdentity } from '../src/vortex/crypto.js';
import { setVortexIdentity as setGatewayIdentity } from '../src/vortex/gateway.js';

process.env.VUC_SANDBOX = 'strict';

const root = process.cwd();
const instruction = loadGovernanceSystemInstruction(root);

// Create an ephemeral Ed25519 identity for this preflight. The private key never
// leaves this process or gets written to the repository. The public key is used
// explicitly during independent verification, proving the signature is real.
const identity = generateVortexIdentity('vuc-internal', 'agent/vuc-preflight', 'vuc-preflight-' + Date.now());
setGatewayIdentity(identity);

function run(label: string, command: string, args: string[]) {
  console.log('\n[INTERNAL-GATE] ' + label);
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VUC_SANDBOX: 'strict' },
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('INTERNAL_GATE_FAILED: ' + message);
}

console.log('[INTERNAL-GATE] VUC governance preflight');
assert(fs.existsSync(path.join(root, 'AGENTS.md')), 'AGENTS.md is missing');
assert(instruction.includes('Agent output is untrusted input.'), 'governance instruction not loaded');

// Prove that the real VUC CLI is installed and executable from this checkout.
run('VUC CLI status', 'npm', ['run', 'vuc', '--', 'status']);
run('GOS3 strict contract', 'npm', ['run', 'verify:gos3']);
run('CLI contract', 'npm', ['run', 'test:cli']);
run('Unit tests', 'npm', ['run', 'test:unit']);
run('Security tests', 'npm', ['run', 'test:security']);

// Real gateway execution: no mock output is accepted. The returned proof must
// verify independently before this internal gate can become green.
const requestId = 'internal-gate-' + process.pid + '-' + Date.now();
const response = await executeVortexPipeline({
  request_id: requestId,
  operation: 'inspect',
  target: { path: '.' },
  input: { gate: 'internal-governance', instruction_length: instruction.length },
});

assert(response.status === 'EXECUTION_SUCCESS', 'gateway status=' + response.status);
assert(response.execution_proof, 'gateway returned no ExecutionProof');
assert(response.execution_proof.executed === true, 'ExecutionProof.executed is not true');
assert(response.execution_proof.signature !== 'mock-sig', 'synthetic mock signature detected');
const verification = verifyExecutionProof(response.execution_proof, { embeddedPublicKey: identity.public_key });
assert(verification.valid === true, 'ExecutionProof verification failed: ' + verification.reasons.join('; '));
assert(verification.checks.signature.passed === true, 'Ed25519 signature check did not pass');
assert(verification.checks.identity.passed === true, 'Embedded public-key identity check did not pass');
console.log('[INTERNAL-GATE] key_id=' + identity.key_id);
console.log('[INTERNAL-GATE] ed25519_signature_verified=true');

run('Web build', 'npm', ['run', 'build']);

console.log('\n[INTERNAL-GATE] PASS');
console.log('[INTERNAL-GATE] external_effect=none');
console.log('[INTERNAL-GATE] verified_execution_proof=true');
