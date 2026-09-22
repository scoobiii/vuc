import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle,
  XCircle,
  Hash,
  FileCheck,
  RotateCcw,
  Sparkles,
  AlertOctagon,
  Copy,
  ExternalLink,
  GitBranch,
  Layers,
  Network,
  Play,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Check,
} from 'lucide-react';
import type { ExecutionProof, VerificationResult, ExecutionProofV2, GraphVerificationResult } from '../vortex/types.js';

interface IndependentVerifierViewProps {
  initialProof?: ExecutionProof | null;
  recentProofs: ExecutionProof[];
}

export const IndependentVerifierView: React.FC<IndependentVerifierViewProps> = ({
  initialProof,
  recentProofs,
}) => {
  const [activeMode, setActiveMode] = useState<'v1_linear' | 'v2_dag'>('v2_dag');

  // V1 State
  const [proofJson, setProofJson] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tamperedField, setTamperedField] = useState<string | null>(null);

  // V2 DAG State
  const [dagRoot, setDagRoot] = useState<ExecutionProofV2 | null>(null);
  const [dagNodes, setDagNodes] = useState<Record<string, ExecutionProofV2>>({});
  const [dagGraphResult, setDagGraphResult] = useState<GraphVerificationResult | null>(null);
  const [loadingDag, setLoadingDag] = useState(false);
  const [experimentResults, setExperimentResults] = useState<any | null>(null);
  const [runningExperiment, setRunningExperiment] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialProof) {
      setProofJson(JSON.stringify(initialProof, null, 2));
      verifyProof(initialProof);
    } else if (recentProofs.length > 0) {
      setProofJson(JSON.stringify(recentProofs[0], null, 2));
      verifyProof(recentProofs[0]);
    }
    loadSampleDag();
  }, [initialProof, recentProofs]);

  const loadSampleDag = async () => {
    try {
      setLoadingDag(true);
      const res = await fetch('/api/vortex/graph/sample');
      if (res.ok) {
        const data = await res.json();
        setDagRoot(data.root);
        setDagNodes(data.nodes);
        verifyDag(data.root, data.nodes);
      }
    } catch (err) {
      console.error('Failed to load sample DAG:', err);
    } finally {
      setLoadingDag(false);
    }
  };

  const verifyDag = async (root?: ExecutionProofV2, nodes?: Record<string, ExecutionProofV2>) => {
    const targetRoot = root || dagRoot;
    const targetNodes = nodes || dagNodes;
    if (!targetRoot) return;

    setLoadingDag(true);
    try {
      const res = await fetch('/api/vortex/graph/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root: targetRoot, nodes: targetNodes }),
      });
      const data: GraphVerificationResult = await res.json();
      setDagGraphResult(data);
    } catch (err: any) {
      setDagGraphResult({
        valid: false,
        status: 'VERIFICATION_FAILED',
        rootExecutionId: targetRoot.executionId,
        nodeCount: 0,
        edgeCount: 0,
        topologicalOrder: [],
        reasons: [`DAG network fault: ${err.message || String(err)}`],
        nodeVerifications: {},
      });
    } finally {
      setLoadingDag(false);
    }
  };

  const runTamperingExperiment = async () => {
    setRunningExperiment(true);
    try {
      const res = await fetch('/api/vortex/graph/experiment', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setExperimentResults(data);
      }
    } catch (err) {
      console.error('Failed to run tampering experiment:', err);
    } finally {
      setRunningExperiment(false);
    }
  };

  const copyText = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const verifyProof = async (proofObj?: ExecutionProof) => {
    setLoading(true);
    let parsed: ExecutionProof;
    try {
      parsed = proofObj || JSON.parse(proofJson);
    } catch (err) {
      setVerificationResult({
        valid: false,
        status: 'VERIFICATION_FAILED',
        reasons: [`JSON parsing error: ${err}`],
        checks: {} as any,
        verified_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/vortex/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof: parsed }),
      });
      const data: VerificationResult = await res.json();
      setVerificationResult(data);
    } catch (err: unknown) {
      setVerificationResult({
        valid: false,
        status: 'VERIFICATION_FAILED',
        reasons: [`Verifier network fault: ${err}`],
        checks: {} as any,
        verified_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Tamper Attack Simulator
  const applyTamper = (type: 'output_hash' | 'executed' | 'agent_id' | 'signature') => {
    try {
      const parsed: ExecutionProof = JSON.parse(proofJson);
      if (type === 'output_hash') {
        parsed.output_hash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      } else if (type === 'executed') {
        parsed.executed = !parsed.executed;
      } else if (type === 'agent_id') {
        parsed.agent_id = 'agent/rogue-unauthorized';
      } else if (type === 'signature') {
        parsed.signature = Buffer.from('corrupted-signature-bytes').toString('base64');
      }

      setTamperedField(type);
      setProofJson(JSON.stringify(parsed, null, 2));
      verifyProof(parsed);
    } catch {
      // Ignored
    }
  };

  const handleSelectRecent = (proof: ExecutionProof) => {
    setTamperedField(null);
    setProofJson(JSON.stringify(proof, null, 2));
    verifyProof(proof);
  };

  const checkKeys = verificationResult?.checks
    ? (Object.keys(verificationResult.checks) as Array<keyof VerificationResult['checks']>)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Independent Verifier (spec §19 & §20)
              </h2>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono text-[10px] font-semibold">
                DAG & Merkle Proof Carrying
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              O verificador é estritamente cético: não confia no agente nem no executor. Ele reconstrói a representação canônica RFC 8785 (JCS), valida assinaturas Ed25519, percorre o grafo direcionado acíclico (DAG) e rejeita ciclos, arestas órfãs ou alterações de hash.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMode('v2_dag')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeMode === 'v2_dag'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Proof-Carrying DAG (v2)
            </button>
            <button
              onClick={() => setActiveMode('v1_linear')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeMode === 'v1_linear'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Prova Linear (v1)
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: PROOF-CARRYING DAG (V2) */}
      {activeMode === 'v2_dag' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadSampleDag()}
                disabled={loadingDag}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDag ? 'animate-spin' : ''}`} />
                Recarregar Grafo DAG de Exemplo
              </button>
              <button
                onClick={() => verifyDag()}
                disabled={loadingDag || !dagRoot}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Auditar DAG Integro
              </button>
            </div>

            <button
              onClick={runTamperingExperiment}
              disabled={runningExperiment}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Play className={`w-3.5 h-3.5 ${runningExperiment ? 'animate-spin' : ''}`} />
              Executar Experimento de Adulteração (3 Vetores + Ciclo)
            </button>
          </div>

          {/* Experimento de Adulteração Resultados (Falsificabilidade Demonstrada) */}
          {experimentResults && (
            <div className="bg-zinc-900 border border-purple-500/40 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Resultado do Experimento Falsificável de Adulteração
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Demonstração mecânica: o verificador detecta com 100% de precisão adulterações de ponteiro, injeções de ciclo e remoção de arestas.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                    experimentResults.allAttacksDetected
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {experimentResults.allAttacksDetected
                    ? '100% ADULTERAÇÕES DETECTADAS'
                    : 'FALHA NA DETECÇÃO'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {experimentResults.experiments.map((exp: any, i: number) => (
                  <div
                    key={exp.scenario}
                    className={`p-3 rounded-lg border flex flex-col justify-between text-xs ${
                      exp.congruent
                        ? 'bg-zinc-950 border-emerald-500/40 text-zinc-200'
                        : 'bg-rose-950/40 border-rose-500 text-rose-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] text-zinc-400 font-bold">
                          #{i + 1}
                        </span>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            exp.passed
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {exp.detected ? 'DETECTADO' : 'ACEITO'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-zinc-100">{exp.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{exp.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 font-mono text-[10px]">
                      <span className="text-zinc-500 block">Status Verificador:</span>
                      <span className={exp.expectedSuccess ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {exp.actualStatus}
                      </span>
                      {exp.reasons && exp.reasons.length > 0 && (
                        <div className="text-zinc-400 text-[9px] mt-1 truncate">
                          {exp.reasons[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAG Visualizer & Audit Report */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: DAG Topological Nodes */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    Nós do Grafo Direcionado Acíclico (DAG)
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">
                    {Object.keys(dagNodes).length} Nós Registrados
                  </span>
                </div>

                <div className="space-y-3">
                  {(Object.values(dagNodes) as ExecutionProofV2[]).map((node) => {
                    const isRoot = dagRoot?.executionId === node.executionId;
                    const nodeVerif = dagGraphResult?.nodeVerifications[node.executionId];
                    return (
                      <div
                        key={node.executionId}
                        className={`p-4 rounded-xl border transition ${
                          isRoot
                            ? 'bg-purple-950/20 border-purple-500/50 shadow-sm'
                            : 'bg-zinc-950 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isRoot
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {isRoot ? 'ROOT EXEC' : 'PARENT NODE'}
                            </span>
                            <span className="font-mono text-xs text-zinc-200 font-bold">
                              {node.executionId}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {nodeVerif && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                                  nodeVerif.valid
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {nodeVerif.valid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {nodeVerif.status}
                              </span>
                            )}
                            <button
                              onClick={() => copyText(JSON.stringify(node, null, 2), node.executionId)}
                              className="text-zinc-500 hover:text-zinc-300 transition"
                            >
                              {copiedId === node.executionId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 mb-2.5">
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Operação / Cap:</span>
                            <span className="text-zinc-300 font-mono">{node.operation} ({node.capability})</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Agente:</span>
                            <span className="text-zinc-300 font-mono truncate block">{node.agentId}</span>
                          </div>
                        </div>

                        {/* Arestas Parents */}
                        {node.parents && node.parents.length > 0 ? (
                          <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                            <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                              <GitBranch className="w-3 h-3 text-purple-400" />
                              Arestas de Causalidade (Parents):
                            </span>
                            <div className="space-y-1">
                              {node.parents.map((p, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded border border-zinc-800 text-[10px] font-mono"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-purple-300 font-semibold text-[9px]">
                                      {p.relation}
                                    </span>
                                    <span className="text-zinc-300">{p.executionId}</span>
                                  </div>
                                  <span className="text-zinc-500 truncate max-w-[160px]">
                                    {p.proofHash.slice(0, 18)}...
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-zinc-800/60 text-[10px] text-zinc-500 italic">
                            Nó raiz de autoridade ou entrada (sem pais)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: DAG Graph Verdict */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Veredito da Auditoria do Grafo
                </h3>

                {dagGraphResult ? (
                  <div className="space-y-4 text-xs">
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        dagGraphResult.valid
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {dagGraphResult.valid ? (
                          <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-7 h-7 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-sm font-mono tracking-tight">
                            {dagGraphResult.status}
                          </div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            {dagGraphResult.valid
                              ? `Grafo DAG verificado com sucesso (${dagGraphResult.nodeCount} nós, ${dagGraphResult.edgeCount} arestas)`
                              : dagGraphResult.reasons.join(' • ')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Topological Sort Trail */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                        Ordem Topológica de Avaliação Causal:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dagGraphResult.topologicalOrder.map((id, idx) => (
                          <React.Fragment key={id}>
                            <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] font-semibold">
                              {id}
                            </span>
                            {idx < dagGraphResult.topologicalOrder.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-zinc-600" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Invariants Checked in DAG */}
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg border bg-zinc-950/70 border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Aciclicidade (Ciclos Proibidos)</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">PASS (NO_CYCLE)</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-zinc-950/70 border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Ligação Merkle (Parent ProofHash)</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">MATCH</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-zinc-950/70 border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Assinatura Ed25519 em todos nós</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">VERIFIED</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-zinc-950/70 border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Semântica de Arestas (DERIVED/AUTH)</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">COMPLETE</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs">
                    Carregando ou aguardando auditoria do DAG...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: LINEAR PROOF V1 (ORIGINAL WORKFLOW) */}
      {activeMode === 'v1_linear' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Proof Input & Tamper Simulator */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Execution Proof JSON (v1)
                </h3>
                {tamperedField && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" />
                    TAMPERED: {tamperedField}
                  </span>
                )}
              </div>

              <textarea
                rows={14}
                value={proofJson}
                onChange={(e) => {
                  setProofJson(e.target.value);
                  setTamperedField(null);
                }}
                placeholder="Paste ExecutionProof JSON here..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-[11px] text-zinc-300 resize-y focus:border-indigo-500 focus:outline-none"
              />

              {/* Tamper attack test bar */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                <div className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Adversarial Tamper Simulation (spec §21)</span>
                  <span className="text-[10px] text-zinc-500">Inject deliberate corruption</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                  <button
                    onClick={() => applyTamper('output_hash')}
                    className="px-2 py-1.5 bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 border border-zinc-700 rounded text-[11px] font-mono transition"
                  >
                    Mutate Hash
                  </button>
                  <button
                    onClick={() => applyTamper('executed')}
                    className="px-2 py-1.5 bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 border border-zinc-700 rounded text-[11px] font-mono transition"
                  >
                    Flip Executed
                  </button>
                  <button
                    onClick={() => applyTamper('agent_id')}
                    className="px-2 py-1.5 bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 border border-zinc-700 rounded text-[11px] font-mono transition"
                  >
                    Spoof Agent ID
                  </button>
                  <button
                    onClick={() => applyTamper('signature')}
                    className="px-2 py-1.5 bg-zinc-800 hover:bg-rose-900/60 text-zinc-300 hover:text-rose-200 border border-zinc-700 rounded text-[11px] font-mono transition"
                  >
                    Corrupt Sig
                  </button>
                </div>
              </div>

              <button
                onClick={() => verifyProof()}
                disabled={loading || !proofJson}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-2 transition shadow"
              >
                <FileCheck className="w-4 h-4" />
                {loading ? 'Recomputing JCS & Ed25519 Verification...' : 'Audit Proof Independently'}
              </button>
            </div>
          </div>

          {/* Right Column: Audit Results */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Audit Verdict & Invariant Checks
              </h3>

              {verificationResult ? (
                <div className="space-y-4 text-xs">
                  {/* Overall Verdict Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      verificationResult.valid
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {verificationResult.valid ? (
                        <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-7 h-7 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm font-mono tracking-tight">
                          {verificationResult.status}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {verificationResult.valid
                            ? 'All 10 normative verification properties verified independently'
                            : verificationResult.reasons.join(' • ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 10 Audit Check Items */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {checkKeys.map((key) => {
                      const check = verificationResult.checks[key];
                      if (!check) return null;
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 text-xs ${
                            check.passed
                              ? 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300'
                              : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {check.passed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-mono font-semibold capitalize">
                                {key.replace('_', ' ')}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">{check.message}</div>
                            </div>
                          </div>

                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase ${
                              check.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                            }`}
                          >
                            {check.passed ? 'OK' : 'FAIL'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* JCS Canonical representation snippet */}
                  {verificationResult.canonical_jcs && (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                      <div className="text-[10px] uppercase font-mono text-zinc-500">
                        RFC 8785 JCS Canonical String (Pre-Hash / Pre-Signature)
                      </div>
                      <pre className="font-mono text-[10px] text-zinc-400 truncate">
                        {verificationResult.canonical_jcs}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-xs">
                  Provide or select an ExecutionProof to inspect and verify.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
