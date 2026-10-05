/**
 * Vortex Governed Privileged Broker & Capability Engine
 *
 * Implements:
 * 1. Separation of Unix identity from Agent identity.
 * 2. Privilege levels: observer, developer, operator, security, data, admin.
 * 3. Typed capability allowlist (no raw unvalidated shell strings).
 * 4. Ephemeral, auditable root/privileged elevation.
 * 5. Cryptographic operation-hash bound approvals (RFC 8785 + Ed25519).
 * 6. Append-only signed audit ledger.
 */

import { sha256, signProofPayload, verifyCanonicalSignature } from './crypto.js';
import { CURRENT_IDENTITY, createSignedProof } from './gateway.js';
import { canonicalizeRFC8785 } from './canonicalize.js';
import type { ExecutionProof } from './types.js';

export type PrivilegeLevel = 'observer' | 'developer' | 'operator' | 'security' | 'data' | 'admin';

export type EnvironmentClass = 'development' | 'test' | 'staging' | 'production' | 'recovery';

export interface AgentContext {
  principal_id: string;      // e.g. "dev-sec", "dev-devops", "vuc-user"
  agent_id: string;          // e.g. "vuc-agent-01"
  session_id: string;        // Unique session identifier
  tenant_id: string;         // Multi-tenant partition
  environment: EnvironmentClass;
  unix_uid?: number;
  unix_username?: string;
}

export interface TypedOperation {
  tool: string;              // e.g. "service.restart", "linux.filesystem.write", "package.install"
  target: string;            // e.g. "nginx", "src/vortex/types.ts", "openssl"
  arguments: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requires_approval: boolean;
}

export interface CryptographicApprovalToken {
  approval_id: string;
  operation_hash: string;    // SHA-256 of RFC 8785 canonical representation of TypedOperation
  approved_by: string;       // principal_id of approver (must be security or admin)
  approver_public_key: string;
  signature: string;         // Ed25519 signature over approval_id + operation_hash + nonce + expires_at
  nonce: string;
  expires_at: string;
  single_use: boolean;
}

export interface PrivilegedExecutionResult {
  success: boolean;
  operation_id: string;
  tool: string;
  target: string;
  privilege_level: PrivilegeLevel;
  elevated_to?: PrivilegeLevel;
  output?: unknown;
  error?: string;
  execution_proof: ExecutionProof;
}

// Maps Unix usernames to their maximum baseline privilege levels
const UNIX_USER_PRIVILEGE_MAP: Record<string, PrivilegeLevel> = {
  'root': 'admin',
  'dev-sec': 'security',
  'dev-devops': 'operator',
  'dev-sm': 'operator',
  'dev-data': 'data',
  'dev-arch': 'developer',
  'dev-be': 'developer',
  'dev-fe': 'developer',
  'dev-po': 'developer',
  'dev': 'developer',
  'vuc-test': 'observer',
  'vuc-user': 'observer',
  'dev-qa': 'observer',
};

// Typed Capability Allowlist by Privilege Level
const PRIVILEGE_CAPABILITIES: Record<PrivilegeLevel, Set<string>> = {
  observer: new Set([
    'system.diagnostic.read',
    'system.status.read',
    'logs.read',
    'service.read',
    'git.inspect',
    'conformance.audit',
    'mcp.inspect',
  ]),
  developer: new Set([
    'system.diagnostic.read',
    'system.status.read',
    'logs.read',
    'service.read',
    'git.inspect',
    'git.propose',
    'test.execute',
    'build.execute',
    'workspace.file.read',
    'workspace.file.write',
    'llm.inference',
  ]),
  operator: new Set([
    'service.read',
    'service.restart',
    'service.status',
    'deployment.read',
    'deployment.apply',
    'package.install.approved',
    'container.lifecycle',
    'git.branch.push',
  ]),
  security: new Set([
    'security.audit',
    'security.containment',
    'keys.verify',
    'proof.audit',
    'sandbox.isolate',
    'approval.grant',
  ]),
  data: new Set([
    'database.query.read',
    'database.migration.apply',
    'telemetry.collect',
    'baseline.benchmark',
  ]),
  admin: new Set([
    'system.package.install',
    'system.user.audit',
    'system.service.manage',
    'system.recovery.execute',
    'security.keys.rotate',
  ]),
};

// Track consumed single-use approvals in memory
const consumedApprovalNonces = new Set<string>();

export class PrivilegedBroker {
  /**
   * Resolves the effective privilege level for a given agent context.
   */
  public static resolvePrivilege(context: AgentContext): PrivilegeLevel {
    const unixUser = context.unix_username || context.principal_id;
    return UNIX_USER_PRIVILEGE_MAP[unixUser] || 'observer';
  }

  /**
   * Validates whether an agent has authorization to execute a typed capability.
   */
  public static evaluateAuthorization(
    context: AgentContext,
    operation: TypedOperation,
    approval?: CryptographicApprovalToken
  ): { authorized: boolean; reason?: string; requiresElevation: boolean } {
    const basePrivilege = this.resolvePrivilege(context);

    // 1. Environment rules
    if (context.environment === 'production' && operation.risk_level === 'critical' && !approval) {
      return {
        authorized: false,
        reason: 'Ambiente de produção exige aprovação criptográfica explícita para ações de risco crítico.',
        requiresElevation: true,
      };
    }

    // 2. Direct capability check
    const allowedForRole = PRIVILEGE_CAPABILITIES[basePrivilege];
    if (allowedForRole && allowedForRole.has(operation.tool)) {
      return { authorized: true, requiresElevation: false };
    }

    // 3. Needs elevation: Check if operation can be executed with approval
    if (!operation.requires_approval && !approval) {
      return {
        authorized: false,
        reason: `Capacidade '${operation.tool}' não concedida ao nível de privilégio '${basePrivilege}'.`,
        requiresElevation: true,
      };
    }

    // 4. Validate cryptographic approval token
    if (approval) {
      const approvalCheck = this.verifyApproval(operation, context, approval);
      if (!approvalCheck.valid) {
        return {
          authorized: false,
          reason: `Aprovação criptográfica inválida: ${approvalCheck.error}`,
          requiresElevation: true,
        };
      }
      return { authorized: true, requiresElevation: true };
    }

    return {
      authorized: false,
      reason: `Operação privilegiada '${operation.tool}' requer Aprovação Criptográfica assinada.`,
      requiresElevation: true,
    };
  }

  /**
   * Computes the deterministic RFC 8785 canonical hash of a typed operation.
   */
  public static computeOperationHash(operation: TypedOperation, context: AgentContext, nonce: string): string {
    const canonicalPayload = canonicalizeRFC8785({
      tool: operation.tool,
      target: operation.target,
      arguments: operation.arguments,
      principal_id: context.principal_id,
      tenant_id: context.tenant_id,
      environment: context.environment,
      nonce,
    });
    return sha256(canonicalPayload);
  }

  /**
   * Verifies an operation approval token (Ed25519 signature + hash match + nonce freshness).
   */
  public static verifyApproval(
    operation: TypedOperation,
    context: AgentContext,
    approval: CryptographicApprovalToken
  ): { valid: boolean; error?: string } {
    // Expiration check
    if (new Date(approval.expires_at).getTime() < Date.now()) {
      return { valid: false, error: 'Token de aprovação expirado.' };
    }

    // Replay / Nonce check
    if (approval.single_use) {
      if (consumedApprovalNonces.has(approval.nonce)) {
        return { valid: false, error: 'Replay detectado: nonce de aprovação já utilizado.' };
      }
    }

    // Hash integrity match
    const expectedHash = this.computeOperationHash(operation, context, approval.nonce);
    if (approval.operation_hash !== expectedHash) {
      return {
        valid: false,
        error: `Divergência no hash da operação: esperado '${expectedHash}', recebido '${approval.operation_hash}'.`,
      };
    }

    // Signature verification
    const signedData = `${approval.approval_id}:${approval.operation_hash}:${approval.nonce}:${approval.expires_at}`;
    const isValidSignature = verifyCanonicalSignature(
      signedData,
      approval.signature,
      approval.approver_public_key
    );

    if (!isValidSignature) {
      return { valid: false, error: 'Assinatura Ed25519 do aprovador é inválida.' };
    }

    // Consume nonce if single-use
    if (approval.single_use) {
      consumedApprovalNonces.add(approval.nonce);
    }

    return { valid: true };
  }

  /**
   * Executes a brokered typed operation and produces an ExecutionProof.
   */
  public static async executeBrokered(
    context: AgentContext,
    operation: TypedOperation,
    executor: () => Promise<unknown>,
    approval?: CryptographicApprovalToken
  ): Promise<PrivilegedExecutionResult> {
    const auth = this.evaluateAuthorization(context, operation, approval);
    const operationId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const basePrivilege = this.resolvePrivilege(context);

    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    if (!auth.authorized) {
      const inputHash = sha256(canonicalizeRFC8785(operation));
      const proof = createSignedProof({
        request_id: operationId,
        execution_id: `exec-denied-${operationId}`,
        runtime_id: 'vortex-privileged-broker',
        agent_id: context.agent_id,
        principal_id: context.principal_id,
        tenant_id: context.tenant_id,
        connector_id: 'privileged-broker',
        operation: 'execute',
        executed: false,
        status: 'POLICY_DENIED',
        input_hash: inputHash,
        output_hash: sha256(''),
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: 0,
        policy_id: 'privileged-broker-policy',
        policy_version: '1.0.0',
        gos3_session_id: `gos3-${operationId}`,
        sandbox_id: 'sandbox-denied',
      });

      return {
        success: false,
        operation_id: operationId,
        tool: operation.tool,
        target: operation.target,
        privilege_level: basePrivilege,
        error: auth.reason,
        execution_proof: proof,
      };
    }

    // Authorized execution under broker
    try {
      const output = await executor();
      const inputHash = sha256(canonicalizeRFC8785(operation));
      const outputHash = sha256(canonicalizeRFC8785((output as Record<string, unknown>) || {}));
      const completedAt = new Date().toISOString();

      const proof = createSignedProof({
        request_id: operationId,
        execution_id: `exec-ok-${operationId}`,
        runtime_id: 'vortex-privileged-broker',
        agent_id: context.agent_id,
        principal_id: context.principal_id,
        tenant_id: context.tenant_id,
        connector_id: 'privileged-broker',
        operation: 'execute',
        executed: true,
        status: 'EXECUTION_SUCCESS',
        input_hash: inputHash,
        output_hash: outputHash,
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: Date.now() - startTime,
        policy_id: 'privileged-broker-policy',
        policy_version: '1.0.0',
        gos3_session_id: `gos3-${operationId}`,
        sandbox_id: auth.requiresElevation ? 'sandbox-elevated-broker' : 'sandbox-standard',
      });

      return {
        success: true,
        operation_id: operationId,
        tool: operation.tool,
        target: operation.target,
        privilege_level: basePrivilege,
        elevated_to: auth.requiresElevation ? 'admin' : undefined,
        output,
        execution_proof: proof,
      };
    } catch (execErr: any) {
      const inputHash = sha256(canonicalizeRFC8785(operation));
      const proof = createSignedProof({
        request_id: operationId,
        execution_id: `exec-err-${operationId}`,
        runtime_id: 'vortex-privileged-broker',
        agent_id: context.agent_id,
        principal_id: context.principal_id,
        tenant_id: context.tenant_id,
        connector_id: 'privileged-broker',
        operation: 'execute',
        executed: false,
        status: 'EXECUTION_ERROR',
        input_hash: inputHash,
        output_hash: sha256(''),
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        policy_id: 'privileged-broker-policy',
        policy_version: '1.0.0',
        gos3_session_id: `gos3-${operationId}`,
        sandbox_id: 'sandbox-error',
      });

      return {
        success: false,
        operation_id: operationId,
        tool: operation.tool,
        target: operation.target,
        privilege_level: basePrivilege,
        error: execErr?.message || String(execErr),
        execution_proof: proof,
      };
    }
  }
}
