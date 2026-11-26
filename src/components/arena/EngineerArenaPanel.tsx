import React from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  GitPullRequest,
  GitMerge,
  Lock,
  Unlock,
  FileCheck,
  Terminal,
  ExternalLink,
  Sliders,
  ArrowRight,
  Clock,
  Activity,
  Wrench,
} from 'lucide-react';
import type { ExecutionProof } from '../../vortex/types.js';
import {
  PATCH_SCENARIOS,
  CASTLE_TRANSLATION_TABLE,
  type ArenaLiveState,
  type CheckRunItem,
  type PatchAuditResponse,
  type PatchScenarioPreset,
} from './arenaGameData.js';

interface EngineerArenaPanelProps {
  liveState: ArenaLiveState | null;
  selectedLiveTarget: 'main' | 'pr68' | 'pr67';
  setSelectedLiveTarget: (t: 'main' | 'pr68' | 'pr67') => void;
  selectedScenarioId: string;
  handleSelectScenario: (preset: PatchScenarioPreset) => void;
  trustAnchorMode: 'trust_store' | 'caller_embedded_s0' | 'key_collision';
  setTrustAnchorMode: (v: 'trust_store' | 'caller_embedded_s0' | 'key_collision') => void;
  approvalPlacement: 'top_level' | 'inside_authorization_ts2353' | 'missing';
  setApprovalPlacement: (v: 'top_level' | 'inside_authorization_ts2353' | 'missing') => void;
  scopeMode: 'bounded' | 'wildcard';
  setScopeMode: (v: 'bounded' | 'wildcard') => void;
  proofSerialization: 'clean_newline' | 'escaped_backslash_n';
  setProofSerialization: (v: 'clean_newline' | 'escaped_backslash_n') => void;
  packageHygiene: 'clean' | 'leaked_pyc';
  setPackageHygiene: (v: 'clean' | 'leaked_pyc') => void;
  payloadMutated: boolean;
  setPayloadMutated: (v: boolean) => void;
  handleQuickRepairCurrentPatch: () => void;
  executeArenaAudit: (prediction: 'PASS' | 'FAIL_CLOSED') => void;
  isDeploying: boolean;
  lastAudit: PatchAuditResponse | null;
  auditHistory: PatchAuditResponse[];
  onSendToVerifier?: (proof: ExecutionProof) => void;
}

export const EngineerArenaPanel: React.FC<EngineerArenaPanelProps> = ({
  liveState,
  selectedLiveTarget,
  setSelectedLiveTarget,
  selectedScenarioId,
  handleSelectScenario,
  trustAnchorMode,
  setTrustAnchorMode,
  approvalPlacement,
  setApprovalPlacement,
  scopeMode,
  setScopeMode,
  proofSerialization,
  setProofSerialization,
  packageHygiene,
  setPackageHygiene,
  payloadMutated,
  setPayloadMutated,
  handleQuickRepairCurrentPatch,
  executeArenaAudit,
  isDeploying,
  lastAudit,
  auditHistory,
  onSendToVerifier,
}) => {
  const pr68Data = liveState?.pull_requests.find((p) => p.number === 68) || null;
  const pr67Data = liveState?.pull_requests.find((p) => p.number === 67) || null;

  const activeLiveChecks: CheckRunItem[] =
    selectedLiveTarget === 'main'
      ? liveState?.main_branch.checks || []
      : selectedLiveTarget === 'pr68'
      ? pr68Data?.checks || []
      : pr67Data?.checks || [];

  return (
    <div className="space-y-8">
      {/* Live Repository & PR Battleground */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              01. Live Repository & Pull Request Battleground
            </h2>
            <p className="text-xs text-zinc-400">
              Real-time GitHub Actions check-runs for scoobiii/vuc (main, PR #68, and PR #67).
            </p>
          </div>
          {liveState?.github_pages?.html_url && (
            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono tabular-nums">
              <span>GitHub Pages: {liveState.github_pages.status}</span>
              <span aria-hidden="true">·</span>
              <a
                href={liveState.github_pages.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 inline-flex items-center gap-1"
              >
                <span>{liveState.github_pages.html_url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div
            onClick={() => setSelectedLiveTarget('main')}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              selectedLiveTarget === 'main'
                ? 'bg-zinc-900/90 border-emerald-500/60'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>CASTLE MAIN BRANCH</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                {liveState?.main_branch.sha ? liveState.main_branch.sha.slice(0, 10) : 'ccc5831fcd'}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-100 line-clamp-1 mb-1">
              {liveState?.main_branch.message || 'feat(security): add S0 trust-anchor CLI protocol view (#68)'}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tabular-nums">
              <span>
                Checks: {liveState?.main_branch.checks_summary.passed ?? 12}/
                {liveState?.main_branch.checks_summary.total ?? 12}
              </span>
              <span aria-hidden="true">·</span>
              <span>Failures: {liveState?.main_branch.checks_summary.failed ?? 0}</span>
            </div>
          </div>

          <div
            onClick={() => setSelectedLiveTarget('pr68')}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              selectedLiveTarget === 'pr68'
                ? 'bg-zinc-900/90 border-indigo-500/60'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <GitMerge className="w-4 h-4 shrink-0" />
                <span>PR #68 · MERGED TO MAIN</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                {pr68Data?.head_sha ? pr68Data.head_sha.slice(0, 10) : 'b4378fc914'}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-100 line-clamp-1 mb-1">
              {pr68Data?.title || 'feat(security): add S0 trust-anchor CLI protocol view'}
            </div>
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-zinc-400 font-mono tabular-nums">
                Checks: {pr68Data?.checks_summary.passed ?? 20}/{pr68Data?.checks_summary.total ?? 20}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectScenario(PATCH_SCENARIOS[1]);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Load #68</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div
            onClick={() => setSelectedLiveTarget('pr67')}
            className={`p-5 rounded-xl border transition cursor-pointer ${
              selectedLiveTarget === 'pr67'
                ? 'bg-zinc-900/90 border-amber-500/60'
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <GitPullRequest className="w-4 h-4 shrink-0" />
                <span>PR #67 · STATE: {pr67Data?.mergeable_state?.toUpperCase() || 'DIRTY'}</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                {pr67Data?.head_sha ? pr67Data.head_sha.slice(0, 10) : 'c31b90ab2d'}
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-100 line-clamp-1 mb-1">
              {pr67Data?.title || 'ci: make merge and npm publish fail-closed'}
            </div>
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-rose-400 font-mono tabular-nums">
                {pr67Data?.checks_summary.failed ?? 5} failing checks
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectScenario(PATCH_SCENARIOS[0]);
                }}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Load #67</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Check-Run Matrix */}
        <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>LIVE GITHUB ACTIONS CHECK-RUNS ({selectedLiveTarget.toUpperCase()})</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono tabular-nums">
              {liveState?.observed_at ? new Date(liveState.observed_at).toLocaleTimeString() : 'live'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {activeLiveChecks.map((check) => {
              const isSuccess = check.conclusion === 'success';
              const isFailure = check.conclusion === 'failure';
              return (
                <a
                  key={check.id}
                  href={check.html_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                    isFailure
                      ? 'bg-rose-950/20 border-rose-800/60 text-rose-200 hover:border-rose-600'
                      : isSuccess
                      ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      : 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isFailure ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                    )}
                    <span className="truncate font-medium" title={check.name}>
                      {check.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] uppercase shrink-0 text-zinc-400">
                    {check.conclusion || check.status}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Patch Workbench + 8-Gate Technical Output */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-semibold text-zinc-100">Patch Engineering Workbench</h3>
              </div>
              <button
                type="button"
                onClick={handleQuickRepairCurrentPatch}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Auto-Fix All</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 02 · S0 Trust Anchor Resolution
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setTrustAnchorMode('trust_store')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      trustAnchorMode === 'trust_store'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Pinned Trust Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrustAnchorMode('caller_embedded_s0')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      trustAnchorMode === 'caller_embedded_s0'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Caller embeddedPublicKey
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 05 · approval_token Contract Placement
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setApprovalPlacement('top_level')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      approvalPlacement === 'top_level'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    VortexRequest Root
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalPlacement('inside_authorization_ts2353')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      approvalPlacement === 'inside_authorization_ts2353'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Inside authorization (TS2353)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 03 · Repository Capability Scope
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setScopeMode('bounded')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      scopeMode === 'bounded'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Bounded [&quot;scoobiii/vuc&quot;]
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeMode('wildcard')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      scopeMode === 'wildcard'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Wildcard [&quot;*&quot;]
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 08 · bin/vua.js --proof-out Serialization
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setProofSerialization('clean_newline')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      proofSerialization === 'clean_newline'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Valid JSON + &quot;\n&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofSerialization('escaped_backslash_n')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      proofSerialization === 'escaped_backslash_n'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Literal &quot;\\n&quot; (PR #67)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 06 · npm pack Provenance Hygiene
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPackageHygiene('clean')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      packageHygiene === 'clean'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Clean dist/vua.cjs
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageHygiene('leaked_pyc')}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      packageHygiene === 'leaked_pyc'
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Leaked __pycache__/*.pyc
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">
                  Gate 04 · Payload Hash vs Approval Binding
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPayloadMutated(false)}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      !payloadMutated
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Matches Approval Hash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayloadMutated(true)}
                    className={`py-2 px-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                      payloadMutated
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Mutated Unapproved Diff
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isDeploying}
                onClick={() => executeArenaAudit('PASS')}
                className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-4 h-4 shrink-0" />
                <span>DEPLOY & PREDICT: PASS</span>
              </button>
              <button
                type="button"
                disabled={isDeploying}
                onClick={() => executeArenaAudit('FAIL_CLOSED')}
                className="py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>PREDICT: FAIL-CLOSED</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: 8 Gates & ExecutionProof */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-base font-semibold text-zinc-100">
              02. VUC 8-Gate Fail-Closed Preflight Pipeline ({selectedScenarioId})
            </h2>
            {lastAudit?.gates ? (
              <div className="space-y-2">
                {lastAudit.gates.map((gate) => (
                  <div
                    key={gate.id}
                    className={`p-3 rounded-lg border ${
                      gate.passed
                        ? 'bg-zinc-950/70 border-zinc-800'
                        : 'bg-rose-950/25 border-rose-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-zinc-100 flex items-center gap-2">
                        {gate.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        )}
                        {gate.name}
                      </span>
                      <span className={`font-mono ${gate.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gate.code}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono pl-6 mt-1 break-all">{gate.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">
                Click one of the Deploy buttons on the left to execute the live 8-gate preflight evaluation.
              </p>
            )}
          </div>

          {lastAudit?.execution_proof && (
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Emitted Ed25519 ExecutionProof v1
                  </h3>
                </div>
                {onSendToVerifier && (
                  <button
                    type="button"
                    onClick={() => onSendToVerifier(lastAudit.execution_proof!)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inspect in Independent Verifier</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block">execution_id</span>
                  <span className="text-zinc-200 break-all">{lastAudit.execution_proof.execution_id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">identity.key_id</span>
                  <span className="text-emerald-400 break-all">{lastAudit.execution_proof.identity.key_id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">proof_hash (RFC 8785)</span>
                  <span className="text-indigo-300 break-all">{lastAudit.execution_proof.proof_hash}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">signature (Ed25519)</span>
                  <span className="text-amber-300/90 break-all">{lastAudit.execution_proof.signature}</span>
                </div>
              </div>
            </div>
          )}

          {auditHistory.length > 0 && (
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Terminal className="w-4 h-4 text-zinc-400" />
                <span>Session Audit Log ({auditHistory.length})</span>
              </div>
              <div className="divide-y divide-zinc-800/80 text-xs font-mono">
                {auditHistory.map((item, idx) => (
                  <div key={`${item.evaluated_at}-${idx}`} className="py-2 flex items-center justify-between gap-2">
                    <span className={item.verdict === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}>
                      [{item.verdict}] {item.title}
                    </span>
                    <span className="text-zinc-400">{item.gates_passed}/{item.total_gates} gates</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Translation Dictionary Table */}
      <section className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">
          Metaphor Translation Matrix (Castelo VUC ↔ VUC Protocol)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {CASTLE_TRANSLATION_TABLE.map((row) => (
            <div key={row.kidTerm} className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-300">{row.kidTerm}</span>
                <span className="font-mono text-indigo-300">{row.engineerTerm}</span>
              </div>
              <p className="text-zinc-400">{row.meaning}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
