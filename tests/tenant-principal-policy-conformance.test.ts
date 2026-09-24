import assert from 'node:assert/strict';
import { handleMCPMessage } from '../src/vortex/mcp-server.js';
import { resetAntiReplayCache } from '../src/vortex/gateway.js';
import { bindPrincipalToTenant, clearTenantBindings } from '../src/vortex/gos3.js';
import { verifyExecutionProof } from '../src/vortex/verifier.js';

const tenant = 'tenant-vuc-ci';
const principal = 'principal-vuc-ci';
const agent = 'agent/vuc-ci-tenant';
const baseAuth = {
  tenant_id: tenant,
  principal_id: principal,
  agent_id: agent,
  policy_id: 'vortex-development',
  policy_version: '1.0.0',
  capability: 'vua.linux.inspect',
  scope: {
    paths: ['/linux/sandbox'],
    repositories: ['scoobiii/vuc'],
    resources: ['vua://linux/inspect_system'],
  },
};

type ConformanceResult = {
  success?: boolean;
  capability_executed?: boolean;
  execution_proof?: any;
  error?: { code?: string; message?: string };
};

async function call(requestId: string, authorization = baseAuth, target: Record<string, unknown> = {}, action = 'inspect_system'): Promise<ConformanceResult> {
  const response = await handleMCPMessage({
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: 'vua.adapter.invoke',
      arguments: {
        adapter_id: 'linux',
        action,
        target,
        payload: {},
        request_id: requestId,
        authorization,
      },
    },
  });
  return (response.result ?? {}) as ConformanceResult;
}

clearTenantBindings();
resetAntiReplayCache();
bindPrincipalToTenant(principal, tenant);

// 1. End-to-end allowed path: tenant + principal + capability + bounded scope.
const allowed = await call('tenant-conformance-allowed');
assert.equal(allowed.success, true);
assert.equal(allowed.capability_executed, true);
assert.equal(allowed.execution_proof?.executed, true);
assert.equal(allowed.execution_proof?.principal_id, principal);
assert.equal(allowed.execution_proof?.proof_hash !== undefined, true);
assert.equal(verifyExecutionProof(allowed.execution_proof).valid, true);

// 2. Cross-tenant request fails closed before connector execution.
const crossTenantAuth = { ...baseAuth, tenant_id: 'tenant-other' };
const crossTenant = await call('tenant-conformance-cross-tenant', crossTenantAuth);
assert.equal(crossTenant.success, false);
assert.equal(crossTenant.execution_proof?.executed, false);
assert.equal(crossTenant.execution_proof?.status, 'POLICY_DENIED');
assert.match(String(crossTenant.error?.message), /tenant/i);

// 3. Capability escalation is denied.
const escalatedCapability = { ...baseAuth, capability: 'system.root_exec' };
const escalated = await call('tenant-conformance-capability-escalation', escalatedCapability);
assert.equal(escalated.success, false);
assert.equal(escalated.execution_proof?.executed, false);
assert.equal(escalated.execution_proof?.status, 'POLICY_DENIED');

// 4. Caller cannot widen its capability scope.
const narrowScope = {
  ...baseAuth,
  scope: { ...baseAuth.scope, repositories: ['example/other-repo'] },
};
const scopeEscalation = await call(
  'tenant-conformance-scope-escalation',
  narrowScope,
  { repository: 'scoobiii/vuc' }
);
assert.equal(scopeEscalation.success, false);
assert.equal(scopeEscalation.execution_proof?.executed, false);
assert.equal(scopeEscalation.execution_proof?.status, 'POLICY_DENIED');
assert.match(String(scopeEscalation.error?.message), /scope/i);

console.log('TENANT_PRINCIPAL_POLICY_CONFORMANCE=PASS');
console.log('tenant_binding=PASS');
console.log('cross_tenant_denied=PASS');
console.log('capability_escalation_denied=PASS');
console.log('scope_escalation_denied=PASS');
console.log('allowed_execution_proof_verified=PASS');
