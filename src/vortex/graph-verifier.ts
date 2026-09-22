/**
 * Vortex MCP Specification - ExecutionProof v2 & Execution Provenance DAG
 * 
 * Implements Proof-Carrying Execution DAG with:
 * - Version 2 ExecutionProof schema
 * - Explicit parent references (executionId + proofHash + semantic relation)
 * - Strict cycle rejection
 * - Canonical RFC 8785 JCS hashing & Ed25519 signature checking
 * - Semantic edge validation (DERIVED_FROM, DEPENDS_ON, AUTHORIZED_BY)
 * - Required relation completeness enforcement
 * - Falsifiable tampering experiment suite (Vetor A, B, C, Ciclo)
 */

import crypto from 'node:crypto';
import { canonicalize } from './canonicalize.js';
import {
  generateVortexIdentity,
  sha256,
  signCanonicalString,
  verifyCanonicalSignature,
} from './crypto.js';

export type Hash = string; // sha256:<hex>

export type ParentRelation = 'DERIVED_FROM' | 'AUTHORIZED_BY' | 'DEPENDS_ON';

export interface ParentRef {
  executionId: string;
  proofHash: Hash;
  relation: ParentRelation;
}

export interface PolicyDecision {
  policyId: string;
  decision: 'ALLOW' | 'DENY';
  capabilityHash: Hash;
}

export interface ExecutionProofV2 {
  version: 2;
  executionId: string;
  agentId: string;
  capability: string;
  operation: string;

  inputHash: Hash;
  stateBeforeHash: Hash;
  outputHash: Hash;
  stateAfterHash: Hash;

  parents: ParentRef[];

  policyDecision: PolicyDecision;

  timestamp: string;
  nonce: string;

  signer: string; // Ed25519 public key in PEM format or key_id
  signature: string; // Base64 Ed25519 signature over RFC 8785 canonical JSON without signature
}

export interface GraphVerificationCheck {
  id: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface GraphVerificationResult {
  valid: boolean;
  status: 'VERIFIED' | 'VERIFICATION_FAILED';
  reasons: string[];
  reachableProofs: string[];
  provenanceChain: Array<{
    executionId: string;
    operation: string;
    capability: string;
    agentId: string;
    relationToParent?: ParentRelation;
  }>;
  checks: GraphVerificationCheck[];
  verifiedAt: string;
}

/**
 * Reconstruct canonical JCS string for an ExecutionProofV2 excluding signature field.
 */
export function canonicalizeProofV2(proof: ExecutionProofV2): string {
  // Explicitly exclude signature before serialization
  const { signature: _sig, ...unsigned } = proof;
  return canonicalize(unsigned);
}

/**
 * Compute the canonical proof hash sha256:hex over unsigned canonicalized payload
 */
export function hashCanonicalProof(proof: ExecutionProofV2): Hash {
  const canonical = canonicalizeProofV2(proof);
  return sha256(canonical);
}

/**
 * Sign an ExecutionProofV2 with an Ed25519 private key
 */
export function signExecutionProofV2(
  proofWithoutSig: Omit<ExecutionProofV2, 'signature'>,
  privateKeyPem: string
): ExecutionProofV2 {
  const canonical = canonicalize(proofWithoutSig);
  const signature = signCanonicalString(canonical, privateKeyPem);
  return {
    ...proofWithoutSig,
    signature,
  };
}

/**
 * Validate edge relation semantics between child and parent proof
 */
export function validateEdge(
  child: ExecutionProofV2,
  parent: ExecutionProofV2,
  relation: ParentRelation
): void {
  switch (relation) {
    case 'DERIVED_FROM':
      if (child.inputHash !== parent.outputHash) {
        throw new Error(
          `derived_from edge does not match input/output: child input ${child.inputHash} != parent output ${parent.outputHash}`
        );
      }
      break;

    case 'DEPENDS_ON':
      if (child.stateBeforeHash !== parent.stateAfterHash) {
        throw new Error(
          `depends_on edge does not match state transition: child stateBefore ${child.stateBeforeHash} != parent stateAfter ${parent.stateAfterHash}`
        );
      }
      break;

    case 'AUTHORIZED_BY':
      if (child.policyDecision.policyId !== parent.operation && child.policyDecision.policyId !== parent.executionId) {
        throw new Error(
          `authorization edge does not match policy proof: child policyId ${child.policyDecision.policyId} != parent op/id ${parent.operation}`
        );
      }
      break;

    default:
      throw new Error(`unknown parent relation: ${relation}`);
  }
}

/**
 * Determine required relations for a given execution proof
 */
export function getRequiredRelations(proof: ExecutionProofV2): ParentRelation[] {
  // Terminal action or settlement nodes strictly require both DERIVED_FROM and AUTHORIZED_BY
  if (proof.operation === 'execute' || proof.operation === 'settlement.atomic_dvp' || proof.operation === 'branch.write') {
    return ['DERIVED_FROM', 'AUTHORIZED_BY'];
  }
  // Intermediate agent action requires AUTHORIZED_BY
  if (proof.operation === 'agent.propose_action' || proof.operation === 'capability.invoke') {
    return ['AUTHORIZED_BY'];
  }
  return [];
}

/**
 * Primary Verifier Engine for ExecutionProof DAG (5 Normative Check Groups)
 */
export function verifyExecutionGraph(
  root: ExecutionProofV2,
  lookup: (id: string) => ExecutionProofV2 | undefined,
  publicKeyPem: string
): GraphVerificationResult {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const checks: GraphVerificationCheck[] = [];
  const reasons: string[] = [];
  const provenanceChain: GraphVerificationResult['provenanceChain'] = [];

  function visit(proof: ExecutionProofV2, parentRef?: ParentRef): void {
    // 1. Cycle Detection
    if (visiting.has(proof.executionId)) {
      throw new Error(`cycle detected at ${proof.executionId}`);
    }

    if (visited.has(proof.executionId)) {
      return;
    }

    visiting.add(proof.executionId);

    // 2. Cryptographic Signature Verification
    const canonical = canonicalizeProofV2(proof);
    const isSigValid = verifyCanonicalSignature(canonical, proof.signature, proof.signer || publicKeyPem);
    if (!isSigValid) {
      throw new Error(`invalid signature: ${proof.executionId}`);
    }
    checks.push({
      id: `sig-${proof.executionId}`,
      passed: true,
      message: `Ed25519 signature verified for ${proof.executionId}`,
    });

    // 3. Proof Hash Verification
    const actualProofHash = hashCanonicalProof(proof);
    if (parentRef && actualProofHash !== parentRef.proofHash) {
      throw new Error(`parent hash mismatch: ${proof.executionId} (expected ${parentRef.proofHash}, calculated ${actualProofHash})`);
    }

    // 4. Required Parent Relations Enforcement
    const required = getRequiredRelations(proof);
    for (const reqRel of required) {
      const hasRel = proof.parents.some((p) => p.relation === reqRel);
      if (!hasRel) {
        throw new Error(`missing required parent relation: ${proof.executionId} requires relation ${reqRel}`);
      }
    }

    // 5. Traverse Parents and Validate Edges
    for (const parent of proof.parents) {
      if (visiting.has(parent.executionId)) {
        throw new Error(`cycle detected at ${parent.executionId}`);
      }

      const parentProof = lookup(parent.executionId);
      if (!parentProof) {
        throw new Error(`missing parent: ${parent.executionId}`);
      }

      const calculatedParentHash = hashCanonicalProof(parentProof);
      if (calculatedParentHash !== parent.proofHash) {
        throw new Error(`parent hash mismatch: ${parent.executionId}`);
      }

      validateEdge(proof, parentProof, parent.relation);
      checks.push({
        id: `edge-${proof.executionId}-${parent.executionId}`,
        passed: true,
        message: `Edge ${proof.executionId} --[${parent.relation}]--> ${parent.executionId} is semantically and cryptographically valid`,
      });

      visit(parentProof, parent);
    }

    visiting.delete(proof.executionId);
    visited.add(proof.executionId);

    provenanceChain.push({
      executionId: proof.executionId,
      operation: proof.operation,
      capability: proof.capability,
      agentId: proof.agentId,
      relationToParent: parentRef?.relation,
    });
  }

  try {
    visit(root);
    return {
      valid: true,
      status: 'VERIFIED',
      reasons: [],
      reachableProofs: [...visited],
      provenanceChain,
      checks,
      verifiedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    reasons.push(errorMsg);
    checks.push({
      id: 'graph-failure',
      passed: false,
      message: errorMsg,
    });
    return {
      valid: false,
      status: 'VERIFICATION_FAILED',
      reasons,
      reachableProofs: [...visited],
      provenanceChain,
      checks,
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Build a canonical, fully-signed 3-node Sample DAG:
 * 
 * exec-001 (Human Intent & Authorization Policy)
 *    │
 *    └── AUTHORIZED_BY
 *          │
 * exec-002 (Agent Propose Action)
 *    │
 *    └── DERIVED_FROM & AUTHORIZED_BY
 *          │
 * exec-003 (Terminal Settlement Execution)
 */
export function buildSampleExecutionDAG(): {
  nodes: Record<string, ExecutionProofV2>;
  rootId: string;
  identity: {
    publicKey: string;
    privateKey: string;
  };
} {
  const identity = generateVortexIdentity('human/admin', 'agent/vortex-orchestrator', 'vortex-dag-deterministic-key');
  const privKey = identity.private_key!;
  const pubKey = identity.public_key;

  const now = new Date('2026-09-20T16:00:00.000Z').toISOString();

  // Node 1: Intent & Authorization Decision
  const state0 = sha256('ledger:genesis:state');
  const state1 = sha256('ledger:policy_approved:state');
  const intentInput = sha256('intent:authorize_drex_atomic_settlement');
  const intentOutput = sha256('policy_grant:scope_dvp_tpft_approved');
  const capHash = sha256('cap:settlement.atomic_dvp');

  const rawNode1: Omit<ExecutionProofV2, 'signature'> = {
    version: 2,
    executionId: 'exec-001',
    agentId: 'human/auditor-sec',
    capability: 'policy.authorize',
    operation: 'policy.authorize',
    inputHash: intentInput,
    stateBeforeHash: state0,
    outputHash: intentOutput,
    stateAfterHash: state1,
    parents: [],
    policyDecision: {
      policyId: 'policy.authorize',
      decision: 'ALLOW',
      capabilityHash: capHash,
    },
    timestamp: now,
    nonce: 'nonce-exec-001-f921',
    signer: pubKey,
  };
  const node1 = signExecutionProofV2(rawNode1, privKey);
  const hashNode1 = hashCanonicalProof(node1);

  // Node 2: Agent Action (Proposes Settlement payload derived from intent)
  const agentInput = intentOutput; // DERIVED_FROM Node 1 output!
  const agentOutput = sha256('payload:transfer_tpft_500000_against_real_digital_1000000');
  const state2 = sha256('ledger:agent_locked_escrow:state');

  const rawNode2: Omit<ExecutionProofV2, 'signature'> = {
    version: 2,
    executionId: 'exec-002',
    agentId: 'agent/drex-clearing',
    capability: 'settlement.propose',
    operation: 'agent.propose_action',
    inputHash: agentInput,
    stateBeforeHash: state1, // DEPENDS_ON state1
    outputHash: agentOutput,
    stateAfterHash: state2,
    parents: [
      {
        executionId: 'exec-001',
        proofHash: hashNode1,
        relation: 'AUTHORIZED_BY',
      },
    ],
    policyDecision: {
      policyId: 'policy.authorize',
      decision: 'ALLOW',
      capabilityHash: capHash,
    },
    timestamp: new Date('2026-09-20T16:00:01.000Z').toISOString(),
    nonce: 'nonce-exec-002-c840',
    signer: pubKey,
  };
  const node2 = signExecutionProofV2(rawNode2, privKey);
  const hashNode2 = hashCanonicalProof(node2);

  // Node 3: Terminal Settlement (Mutates balance, satisfies required relations DERIVED_FROM & AUTHORIZED_BY)
  const terminalInput = agentOutput; // DERIVED_FROM Node 2 output!
  const terminalOutput = sha256('receipt:dvp_settlement_block_849102');
  const state3 = sha256('ledger:final_settled:state');

  const rawNode3: Omit<ExecutionProofV2, 'signature'> = {
    version: 2,
    executionId: 'exec-003',
    agentId: 'engine/dvp-executor',
    capability: 'settlement.atomic_dvp',
    operation: 'execute',
    inputHash: terminalInput,
    stateBeforeHash: state2, // DEPENDS_ON state2
    outputHash: terminalOutput,
    stateAfterHash: state3,
    parents: [
      {
        executionId: 'exec-002',
        proofHash: hashNode2,
        relation: 'DERIVED_FROM',
      },
      {
        executionId: 'exec-001',
        proofHash: hashNode1,
        relation: 'AUTHORIZED_BY',
      },
    ],
    policyDecision: {
      policyId: 'policy.authorize',
      decision: 'ALLOW',
      capabilityHash: capHash,
    },
    timestamp: new Date('2026-09-20T16:00:02.000Z').toISOString(),
    nonce: 'nonce-exec-003-a178',
    signer: pubKey,
  };
  const node3 = signExecutionProofV2(rawNode3, privKey);

  return {
    nodes: {
      'exec-001': node1,
      'exec-002': node2,
      'exec-003': node3,
    },
    rootId: 'exec-003',
    identity: {
      publicKey: pubKey,
      privateKey: privKey,
    },
  };
}

/**
 * Falsifiable Tampering Experiments Suite (Returns proof of all 3 vector detections + cycle + intact)
 */
export function runTamperingExperimentSuite(): {
  suite: string;
  timestamp: string;
  allPassed: boolean;
  vectors: Array<{
    id: string;
    name: string;
    description: string;
    expectedError: string;
    observedError: string | null;
    passed: boolean;
    tamperedNode?: string;
  }>;
} {
  const sample = buildSampleExecutionDAG();
  const pubKey = sample.identity.publicKey;
  const privKey = sample.identity.privateKey;

  const cloneGraph = () => JSON.parse(JSON.stringify(sample.nodes)) as Record<string, ExecutionProofV2>;

  const vectors: Array<{
    id: string;
    name: string;
    description: string;
    expectedError: string;
    observedError: string | null;
    passed: boolean;
    tamperedNode?: string;
  }> = [];

  // Case 0: Intact Graph
  {
    const graph = cloneGraph();
    const result = verifyExecutionGraph(graph['exec-003'], (id) => graph[id], pubKey);
    vectors.push({
      id: 'DAG-INTACT',
      name: 'Baseline DAG Intacto',
      description: 'Verificação do grafo íntegro sem qualquer adulteração. Deve aceitar e reconstruir proveniência completa.',
      expectedError: 'NONE (PASS)',
      observedError: result.valid ? null : result.reasons.join('; '),
      passed: result.valid,
    });
  }

  // Vector A: Alterar um ancestral (exec-001 outputHash alterado)
  {
    const graph = cloneGraph();
    graph['exec-001'].outputHash = 'sha256:00000000000000000000000000000000000000000000000000000000tampered';
    // Even if not re-signed, signature fails. If re-signed with unknown key, signature fails. If re-signed with same key, parent hash in exec-002 fails!
    const result = verifyExecutionGraph(graph['exec-003'], (id) => graph[id], pubKey);
    const observed = result.reasons[0] || null;
    const passed = !result.valid && (observed?.includes('invalid signature') || observed?.includes('parent hash mismatch') || observed?.includes('derived_from'));
    vectors.push({
      id: 'VETOR-A',
      name: 'Vetor A — Alterar Ancestral',
      description: 'Altera o outputHash de exec-001 mantendo o restante do grafo intacto.',
      expectedError: 'invalid signature: exec-001',
      observedError: observed,
      passed,
      tamperedNode: 'exec-001',
    });
  }

  // Vector B: Remover uma aresta (remover referências em exec-003.parents)
  {
    const graph = cloneGraph();
    graph['exec-003'].parents = []; // Remove all parents
    // Re-sign exec-003 so signature passes, but completeness rule catches missing required relations
    const { signature: _sig, ...unsigned } = graph['exec-003'];
    graph['exec-003'] = signExecutionProofV2(unsigned, privKey);

    const result = verifyExecutionGraph(graph['exec-003'], (id) => graph[id], pubKey);
    const observed = result.reasons[0] || null;
    const passed = !result.valid && observed?.includes('missing required parent relation');
    vectors.push({
      id: 'VETOR-B',
      name: 'Vetor B — Remover Aresta Obrigatória',
      description: 'Remove a aresta obrigatória DERIVED_FROM / AUTHORIZED_BY de exec-003.parents.',
      expectedError: 'missing required parent relation: exec-003 requires relation DERIVED_FROM',
      observedError: observed,
      passed,
      tamperedNode: 'exec-003',
    });
  }

  // Vector C: Reordenar ou substituir a cadeia (troca pai causal correto por outro nó incompatível)
  {
    const graph = cloneGraph();
    // Swap exec-003's DERIVED_FROM parent (exec-002) with exec-001
    graph['exec-003'].parents[0] = {
      executionId: 'exec-001',
      proofHash: hashCanonicalProof(graph['exec-001']),
      relation: 'DERIVED_FROM',
    };
    const { signature: _sig, ...unsigned } = graph['exec-003'];
    graph['exec-003'] = signExecutionProofV2(unsigned, privKey);

    const result = verifyExecutionGraph(graph['exec-003'], (id) => graph[id], pubKey);
    const observed = result.reasons[0] || null;
    const passed = !result.valid && (observed?.includes('derived_from edge does not match') || observed?.includes('parent hash mismatch'));
    vectors.push({
      id: 'VETOR-C',
      name: 'Vetor C — Reordenar ou Substituir Cadeia',
      description: 'Substitui a referência ao pai causal correto por outro nó arbitrário na topologia.',
      expectedError: 'derived_from edge does not match input/output',
      observedError: observed,
      passed,
      tamperedNode: 'exec-003',
    });
  }

  // Vector D: Rejeitar ciclos
  {
    const graph = cloneGraph();
    // Introduce cycle: exec-003 references itself as a parent
    graph['exec-003'].parents.push({
      executionId: 'exec-003',
      proofHash: hashCanonicalProof(graph['exec-003']),
      relation: 'DEPENDS_ON',
    });
    const { signature: _sig, ...unsigned } = graph['exec-003'];
    graph['exec-003'] = signExecutionProofV2(unsigned, privKey);

    const result = verifyExecutionGraph(graph['exec-003'], (id) => graph[id], pubKey);
    const observed = result.reasons[0] || null;
    const passed = !result.valid && (observed?.includes('cycle detected') || observed?.includes('cycle'));
    vectors.push({
      id: 'VETOR-D',
      name: 'Vetor D — Rejeição de Ciclos no Grafo',
      description: 'Injeta uma aresta cíclica (exec-003 -> exec-003). O verificador deve abortar a travessia e rejeitar o DAG com erro de ciclo.',
      expectedError: 'cycle detected at exec-003',
      observedError: observed,
      passed,
      tamperedNode: 'exec-003',
    });
  }

  const allPassed = vectors.every((v) => v.passed);

  return {
    suite: 'Vortex ExecutionProof DAG & Tamper-Evident Experiment Suite (RFC 8785 + Ed25519)',
    timestamp: new Date().toISOString(),
    allPassed,
    vectors,
  };
}
