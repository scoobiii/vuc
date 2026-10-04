import assert from 'node:assert/strict';
import { PrivilegedBroker, type AgentContext, type TypedOperation, type CryptographicApprovalToken } from '../src/vortex/privileged-broker.js';
import { generateVortexIdentity, signCanonicalString, sha256 } from '../src/vortex/crypto.js';
import { canonicalizeRFC8785 } from '../src/vortex/canonicalize.js';

console.log('--- Testing PrivilegedBroker & Capability Security ---');

// 1. Resolve Privilege Levels
const observerContext: AgentContext = {
  principal_id: 'vuc-user',
  agent_id: 'agent-observer',
  session_id: 'sess-01',
  tenant_id: 'tenant-default',
  environment: 'development',
};

const operatorContext: AgentContext = {
  principal_id: 'dev-devops',
  agent_id: 'agent-operator',
  session_id: 'sess-02',
  tenant_id: 'tenant-default',
  environment: 'development',
};

assert.equal(PrivilegedBroker.resolvePrivilege(observerContext), 'observer');
assert.equal(PrivilegedBroker.resolvePrivilege(operatorContext), 'operator');
console.log('PASS: Privilege level resolution');

// 2. Observer denied from service.restart
const restartOp: TypedOperation = {
  tool: 'service.restart',
  target: 'nginx',
  arguments: { graceful: true },
  risk_level: 'medium',
  requires_approval: false,
};

const observerAuth = PrivilegedBroker.evaluateAuthorization(observerContext, restartOp);
assert.equal(observerAuth.authorized, false);
console.log('PASS: Observer denied from unprivileged service.restart');

// 3. Operator allowed to service.restart
const operatorAuth = PrivilegedBroker.evaluateAuthorization(operatorContext, restartOp);
assert.equal(operatorAuth.authorized, true);
console.log('PASS: Operator authorized for service.restart');

// 4. Critical Operation Requiring Cryptographic Approval
const criticalOp: TypedOperation = {
  tool: 'system.service.manage',
  target: 'systemd',
  arguments: { action: 'isolate', unit: 'rescue.target' },
  risk_level: 'critical',
  requires_approval: true,
};

// Without approval -> Denied
const deniedCritical = PrivilegedBroker.evaluateAuthorization(operatorContext, criticalOp);
assert.equal(deniedCritical.authorized, false);
console.log('PASS: Critical action without approval denied');

// With valid cryptographic approval token
const secIdentity = generateVortexIdentity('dev-sec');
const nonce = `nonce-${Date.now()}-${Math.random()}`;
const opHash = PrivilegedBroker.computeOperationHash(criticalOp, operatorContext, nonce);
const approvalId = 'appr-001';
const expiresAt = new Date(Date.now() + 60000).toISOString();
const signedData = `${approvalId}:${opHash}:${nonce}:${expiresAt}`;
const signature = signCanonicalString(signedData, secIdentity.private_key!);

const validApprovalToken: CryptographicApprovalToken = {
  approval_id: approvalId,
  operation_hash: opHash,
  approved_by: 'dev-sec',
  approver_public_key: secIdentity.public_key,
  signature,
  nonce,
  expires_at: expiresAt,
  single_use: true,
};

const approvedCritical = PrivilegedBroker.evaluateAuthorization(operatorContext, criticalOp, validApprovalToken);
assert.equal(approvedCritical.authorized, true);
assert.equal(approvedCritical.requiresElevation, true);
console.log('PASS: Cryptographically signed approval authorizes critical elevation');

// 5. Tampered Operation Hash Rejected (Fail-Closed)
const tamperedApproval: CryptographicApprovalToken = {
  ...validApprovalToken,
  operation_hash: sha256('tampered-operation-payload'),
};

const tamperedAuth = PrivilegedBroker.evaluateAuthorization(operatorContext, criticalOp, tamperedApproval);
assert.equal(tamperedAuth.authorized, false);
console.log('PASS: Tampered approval hash fails closed');

// 6. Execution Broker with ExecutionProof Generation
const execResult = await PrivilegedBroker.executeBrokered(
  operatorContext,
  restartOp,
  async () => {
    return { status: 'restarted', uptime: 0 };
  }
);

assert.equal(execResult.success, true);
assert.equal(execResult.execution_proof.status, 'EXECUTION_SUCCESS');
assert.ok(execResult.execution_proof.proof_hash);
assert.ok(execResult.execution_proof.signature);
console.log('PASS: Brokered execution emits valid signed ExecutionProof');

console.log('ALL PRIVILEGED BROKER SECURITY TESTS PASS! (6/6)');
