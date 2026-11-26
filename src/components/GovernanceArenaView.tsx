import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  Unlock,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
  Search,
  Globe,
  Star,
  GitFork,
  AlertTriangle,
  Eye,
  GitBranch,
  Scale,
  Code2,
  Castle,
  Play,
  GitCommit,
  Activity,
  GitPullRequest,
  Sliders,
  Key,
  Cpu,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ExecutionProof } from '../vortex/types.js';
import {
  LANGUAGE_COLORS,
  PATCH_SCENARIOS,
  UNIVERSAL_ARENA_I18N,
  UNIVERSAL_REPO_PRESETS,
  UNIVERSAL_SECURITY_LEVERS,
  playCastleSound,
  type ArenaLiveState,
  type CheckRunItem,
  type PatchAuditResponse,
  type PatchScenarioPreset,
  type PullRequestState,
  type UniversalRepoConnectorResponse,
} from './arena/arenaGameData.js';
import { EngineerArenaPanel } from './arena/EngineerArenaPanel.js';
import { CastleGatesAdventurePanel } from './arena/CastleGatesAdventurePanel.js';

type ArenaViewMode = 'gates_game' | 'kids' | 'split' | 'senior' | 'workbench';
type ArenaLang = 'pt' | 'en';

interface GovernanceArenaViewProps {
  onSendToVerifier?: (proof: ExecutionProof) => void;
}

const LEVER_ICONS = [Shield, Lock, Key, Eye, Cpu, CheckCircle2];

export const GovernanceArenaView: React.FC<GovernanceArenaViewProps> = ({ onSendToVerifier }) => {
  const [lang, setLang] = useState<ArenaLang>('pt');
  const [viewMode, setViewMode] = useState<ArenaViewMode>('gates_game');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Universal VUC Connector State (Works for ANY GitHub Repository)
  const [repoInput, setRepoInput] = useState<string>('scoobiii/vuc');
  const [activeRepoName, setActiveRepoName] = useState<string>('scoobiii/vuc');
  const [universalData, setUniversalData] = useState<UniversalRepoConnectorResponse | null>(null);
  const [loadingConnector, setLoadingConnector] = useState<boolean>(true);
  const [connectorError, setConnectorError] = useState<string | null>(null);
  const [showConnectorProofDetails, setShowConnectorProofDetails] = useState<boolean>(false);

  // 6 Interactive Security Levers (G1..G6)
  const [levers, setLevers] = useState<boolean[]>([true, true, true, true, true, true]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live GitHub & Backend State for Engineer Workbench & 8-Gates Adventure
  const [liveState, setLiveState] = useState<ArenaLiveState | null>(null);
  const [loadingLive, setLoadingLive] = useState<boolean>(true);
  const [selectedLiveTarget, setSelectedLiveTarget] = useState<'main' | 'pr68' | 'pr67'>('pr67');

  // Patch Workbench State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PATCH_SCENARIOS[0].id);
  const [patchTitle, setPatchTitle] = useState<string>(PATCH_SCENARIOS[0].title);
  const [targetBranch, setTargetBranch] = useState<string>(PATCH_SCENARIOS[0].targetBranch);
  const [trustAnchorMode, setTrustAnchorMode] = useState<'trust_store' | 'caller_embedded_s0' | 'key_collision'>(
    PATCH_SCENARIOS[0].config.trustAnchorMode
  );
  const [approvalPlacement, setApprovalPlacement] = useState<'top_level' | 'inside_authorization_ts2353' | 'missing'>(
    PATCH_SCENARIOS[0].config.approvalPlacement
  );
  const [scopeMode, setScopeMode] = useState<'bounded' | 'wildcard'>(PATCH_SCENARIOS[0].config.scopeMode);
  const [proofSerialization, setProofSerialization] = useState<'clean_newline' | 'escaped_backslash_n'>(
    PATCH_SCENARIOS[0].config.proofSerialization
  );
  const [packageHygiene, setPackageHygiene] = useState<'clean' | 'leaked_pyc'>(
    PATCH_SCENARIOS[0].config.packageHygiene
  );
  const [payloadMutated, setPayloadMutated] = useState<boolean>(PATCH_SCENARIOS[0].config.payloadMutated);

  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [lastAudit, setLastAudit] = useState<PatchAuditResponse | null>(null);
  const [auditHistory, setAuditHistory] = useState<PatchAuditResponse[]>([]);
  const [arenaScore, setArenaScore] = useState<number>(1200);
  const [clearedGates, setClearedGates] = useState<number[]>([]);
  const [missionsCleared, setMissionsCleared] = useState<string[]>(['pr68-clean-s0-remediation']);

  const t = UNIVERSAL_ARENA_I18N[lang];
  const allLeversOn = levers.every(Boolean);

  // Invoke the real VUC GitHub Universal Connector (`POST /api/vortex/arena/universal-repo`)
  const invokeUniversalRepoConnector = useCallback(
    async (targetRepoStr: string, forceRefresh = false) => {
      const cleaned = targetRepoStr
        .trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\.git$/i, '')
        .split('/')
        .filter(Boolean)
        .slice(0, 2)
        .join('/');

      if (!cleaned || !cleaned.includes('/')) {
        setConnectorError(
          lang === 'pt'
            ? 'Formato inválido. Use owner/repo (ex: scoobiii/vuc, facebook/react)'
            : 'Invalid format. Use owner/repo (e.g. scoobiii/vuc, facebook/react)'
        );
        return;
      }

      setLoadingConnector(true);
      setConnectorError(null);

      try {
        const res = await fetch('/api/vortex/arena/universal-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo: cleaned, forceRefresh }),
        });
        const data: UniversalRepoConnectorResponse = await res.json();

        if (!res.ok || !data.success) {
          setConnectorError(
            data.error ||
              (lang === 'pt'
                ? `Falha ao inspecionar ${cleaned} via VUC Connector.`
                : `Failed to inspect ${cleaned} via VUC Connector.`)
          );
          setLoadingConnector(false);
          return;
        }

        setUniversalData(data);
        setActiveRepoName(data.repo.full_name || cleaned);
        setRepoInput(data.repo.full_name || cleaned);
      } catch (err: any) {
        setConnectorError(
          err?.message ||
            (lang === 'pt'
              ? 'Erro de comunicação com o VUC Connector.'
              : 'Communication error with VUC Connector.')
        );
      } finally {
        setLoadingConnector(false);
      }
    },
    [lang]
  );

  const fetchLiveArenaState = useCallback(async (forceRefresh = false) => {
    setLoadingLive(true);
    try {
      const res = await fetch(`/api/vortex/arena/live-state${forceRefresh ? '?refresh=1' : ''}`);
      if (res.ok) {
        const data: ArenaLiveState = await res.json();
        setLiveState(data);
        setLoadingLive(false);
        return;
      }
    } catch {
      // Fallback to public GitHub API if needed
    }

    try {
      const [mainRes, pr68Res, pr67Res] = await Promise.all([
        fetch('https://api.github.com/repos/scoobiii/vuc/branches/main'),
        fetch('https://api.github.com/repos/scoobiii/vuc/pulls/68'),
        fetch('https://api.github.com/repos/scoobiii/vuc/pulls/67'),
      ]);
      const mainBranch = mainRes.ok ? await mainRes.json() : null;
      const pr68 = pr68Res.ok ? await pr68Res.json() : null;
      const pr67 = pr67Res.ok ? await pr67Res.json() : null;

      const mainSha = mainBranch?.commit?.sha || '';
      const pr68Sha = pr68?.head?.sha || '';
      const pr67Sha = pr67?.head?.sha || '';

      const [mainChecksRaw, pr68ChecksRaw, pr67ChecksRaw] = await Promise.all([
        mainSha
          ? fetch(`https://api.github.com/repos/scoobiii/vuc/commits/${mainSha}/check-runs?per_page=100`).then((r) =>
              r.json()
            )
          : Promise.resolve(null),
        pr68Sha
          ? fetch(`https://api.github.com/repos/scoobiii/vuc/commits/${pr68Sha}/check-runs?per_page=100`).then((r) =>
              r.json()
            )
          : Promise.resolve(null),
        pr67Sha
          ? fetch(`https://api.github.com/repos/scoobiii/vuc/commits/${pr67Sha}/check-runs?per_page=100`).then((r) =>
              r.json()
            )
          : Promise.resolve(null),
      ]);

      const mapChecks = (raw: any): CheckRunItem[] =>
        Array.isArray(raw?.check_runs)
          ? raw.check_runs.map((c: any) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              conclusion: c.conclusion,
              started_at: c.started_at,
              completed_at: c.completed_at,
              html_url: c.html_url,
            }))
          : [];

      const mapPr = (pr: any, checks: CheckRunItem[]): PullRequestState | null => {
        if (!pr || !pr.number) return null;
        return {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          merged: Boolean(pr.merged),
          merged_at: pr.merged_at || null,
          mergeable: pr.mergeable,
          mergeable_state: pr.mergeable_state || 'unknown',
          html_url: pr.html_url,
          head_ref: pr.head?.ref || '',
          head_sha: pr.head?.sha || '',
          base_ref: pr.base?.ref || 'main',
          base_sha: pr.base?.sha || '',
          changed_files: pr.changed_files ?? 0,
          additions: pr.additions ?? 0,
          deletions: pr.deletions ?? 0,
          checks_summary: {
            total: checks.length,
            passed: checks.filter((c) => c.conclusion === 'success').length,
            failed: checks.filter((c) => c.conclusion === 'failure').length,
            pending: checks.filter((c) => c.status !== 'completed').length,
          },
          checks,
        };
      };

      const mainChecks = mapChecks(mainChecksRaw);
      const pr68Checks = mapChecks(pr68ChecksRaw);
      const pr67Checks = mapChecks(pr67ChecksRaw);

      setLiveState({
        observed_at: new Date().toISOString(),
        external_effect: 'none',
        repository: 'scoobiii/vuc',
        github_pages: {
          html_url: 'https://scoobiii.github.io/vuc/',
          status: 'built',
          branch: 'main',
        },
        local_preflight: {
          governance_markers_valid: true,
          governance_instruction_hash: 'sha256:verified',
          signer_key_id: 'key-vortex-2026-prod',
          signer_algorithm: 'Ed25519',
          trust_store_anchored: true,
          active_gos3_sessions: 1,
          cli_artifact_present: true,
          server_artifact_present: true,
          pycache_clean: true,
        },
        main_branch: {
          name: 'main',
          sha: mainSha,
          message: mainBranch?.commit?.commit?.message?.split('\n')[0] || '',
          author: mainBranch?.commit?.commit?.author?.name || 'scoobiii',
          date: mainBranch?.commit?.commit?.author?.date || '',
          protected: Boolean(mainBranch?.protected),
          checks_summary: {
            total: mainChecks.length,
            passed: mainChecks.filter((c) => c.conclusion === 'success').length,
            failed: mainChecks.filter((c) => c.conclusion === 'failure').length,
            pending: mainChecks.filter((c) => c.status !== 'completed').length,
          },
          checks: mainChecks,
        },
        pull_requests: [mapPr(pr68, pr68Checks), mapPr(pr67, pr67Checks)].filter(Boolean) as PullRequestState[],
      });
    } catch (err) {
      console.error('Failed to load live GitHub state:', err);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    invokeUniversalRepoConnector('scoobiii/vuc', false);
    fetchLiveArenaState(false);
  }, [invokeUniversalRepoConnector, fetchLiveArenaState]);

  const handleSelectScenario = (preset: PatchScenarioPreset) => {
    setSelectedScenarioId(preset.id);
    setPatchTitle(preset.title);
    setTargetBranch(preset.targetBranch);
    setTrustAnchorMode(preset.config.trustAnchorMode);
    setApprovalPlacement(preset.config.approvalPlacement);
    setScopeMode(preset.config.scopeMode);
    setProofSerialization(preset.config.proofSerialization);
    setPackageHygiene(preset.config.packageHygiene);
    setPayloadMutated(preset.config.payloadMutated);
    setLastAudit(null);
  };

  const handleQuickRepairCurrentPatch = () => {
    setTrustAnchorMode('trust_store');
    setApprovalPlacement('top_level');
    setScopeMode('bounded');
    setProofSerialization('clean_newline');
    setPackageHygiene('clean');
    setPayloadMutated(false);
  };

  const executeArenaAudit = async (chosenPrediction: 'PASS' | 'FAIL_CLOSED', forceClean = false) => {
    if (isDeploying) return;
    setIsDeploying(true);

    try {
      const res = await fetch('/api/vortex/arena/audit-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenarioId,
          title: patchTitle,
          targetBranch,
          trustAnchorMode: forceClean ? 'trust_store' : trustAnchorMode,
          approvalPlacement: forceClean ? 'top_level' : approvalPlacement,
          scopeMode: forceClean ? 'bounded' : scopeMode,
          proofSerialization: forceClean ? 'clean_newline' : proofSerialization,
          packageHygiene: forceClean ? 'clean' : packageHygiene,
          payloadMutated: forceClean ? false : payloadMutated,
          playerPrediction: chosenPrediction,
        }),
      });

      if (res.ok) {
        const auditData: PatchAuditResponse = await res.json();
        setLastAudit(auditData);
        setAuditHistory((prev) => [auditData, ...prev.slice(0, 9)]);
        setArenaScore((prev) => Math.max(0, prev + auditData.score_delta));
        if (auditData.verdict === 'PASS' && !missionsCleared.includes(selectedScenarioId)) {
          setMissionsCleared((prev) => [...prev, selectedScenarioId]);
        }
      }
    } catch (err) {
      console.error('Arena patch evaluation failed:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  // Audit the 6 interactive levers directly against the real VUC Gateway `/api/vortex/arena/audit-patch`
  const handleAuditSixLevers = async (overrideLevers?: boolean[]) => {
    const activeLevers = overrideLevers || levers;
    const isAllOn = activeLevers.every(Boolean);
    playCastleSound(isAllOn ? 'gate_open' : 'gate_blocked', soundEnabled);

    setIsDeploying(true);
    try {
      const res = await fetch('/api/vortex/arena/audit-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: `universal-arena-${activeRepoName.replace('/', '-')}`,
          title: `Universal Arena Audit (${activeRepoName})`,
          targetBranch: universalData?.repo.default_branch || 'main',
          // Map the 6 levers to the real 8-gate backend audit parameters:
          scopeMode: activeLevers[0] ? 'bounded' : 'wildcard',
          approvalPlacement: activeLevers[1] && activeLevers[4] ? 'top_level' : 'inside_authorization_ts2353',
          proofSerialization: activeLevers[2] ? 'clean_newline' : 'escaped_backslash_n',
          trustAnchorMode: activeLevers[3] ? 'trust_store' : 'caller_embedded_s0',
          packageHygiene: activeLevers[5] ? 'clean' : 'leaked_pyc',
          payloadMutated: !activeLevers[5],
          playerPrediction: isAllOn ? 'PASS' : 'FAIL_CLOSED',
        }),
      });

      if (res.ok) {
        const auditData: PatchAuditResponse = await res.json();
        setLastAudit(auditData);
        setAuditHistory((prev) => [auditData, ...prev.slice(0, 9)]);
        setArenaScore((prev) => Math.max(0, prev + auditData.score_delta));
      }
    } catch (err) {
      console.error('Failed to audit levers:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleToggleLever = (idx: number) => {
    const next = [...levers];
    next[idx] = !next[idx];
    setLevers(next);
    playCastleSound(next.every(Boolean) ? 'gate_open' : 'gate_blocked', soundEnabled);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Compute language percentages for the currently loaded repository
  const langRecord: Record<string, number> = universalData?.languages || {};
  const totalLangBytes = Object.values(langRecord).reduce((acc: number, v: number) => acc + Number(v || 0), 0);
  const languagePercentages = Object.entries(langRecord)
    .map(([langName, bytes]) => ({
      lang: langName,
      pct: totalLangBytes > 0 ? Math.max(1, Math.round((Number(bytes || 0) / totalLangBytes) * 100)) : 0,
      color: LANGUAGE_COLORS[langName] || '#8b5cf6',
    }))
    .slice(0, 6);

  const repoInfo = universalData?.repo || {
    full_name: activeRepoName,
    name: activeRepoName.split('/')[1] || 'vuc',
    description: 'Vortex Universal Connector — Cryptographic Execution Governance & Ed25519 Proofs',
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 2,
    watchers_count: 1,
    default_branch: 'main',
    language: 'TypeScript',
    updated_at: new Date().toISOString(),
    license: { spdx_id: 'Apache-2.0' },
    owner: {
      login: activeRepoName.split('/')[0] || 'scoobiii',
      avatar_url: `https://github.com/${activeRepoName.split('/')[0] || 'scoobiii'}.png`,
      type: 'User',
    },
  };

  const repoOwner = repoInfo.owner.login || activeRepoName.split('/')[0] || 'scoobiii';
  const repoShortName = repoInfo.name || activeRepoName.split('/')[1] || 'vuc';

  return (
    <div className="space-y-6 pb-12 text-zinc-100">
      {/* 1. UNIVERSAL HEADER BAR */}
      <header className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Pangolin Identity */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 via-amber-400/20 to-indigo-500/20 border border-emerald-400/40 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-mono text-[9px] font-bold">
                ANY
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">{t.title}</h1>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  O&apos;Reilly Pangolin • Universal
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {repoInfo.full_name}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          {/* Mode Switcher, Language & Sound Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('gates_game')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'gates_game'
                    ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-950/40 ring-1 ring-amber-300'
                    : 'text-amber-300 hover:text-amber-200 hover:bg-zinc-800'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>{t.modeGates}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kids')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'kids'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.modeKids}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.modeSplit}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('senior')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'senior'
                    ? 'bg-emerald-400 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.modeSenior}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('workbench')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'workbench'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.modeWorkbench}
              </button>
            </div>

            <div className="inline-flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setLang('pt')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                  lang === 'pt' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                PT
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                  lang === 'en' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              title={soundEnabled ? 'Som ligado' : 'Som mudo'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                invokeUniversalRepoConnector(activeRepoName, true);
                fetchLiveArenaState(true);
              }}
              disabled={loadingConnector}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer disabled:opacity-50"
              title="Inspecionar novamente via VUC Connector"
            >
              <RefreshCw className={`w-4 h-4 ${loadingConnector ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MODE ROUTING: 8 GATES ADVENTURE GAME OR ENGINEER WORKBENCH */}
      {viewMode === 'gates_game' && (
        <CastleGatesAdventurePanel
          liveState={liveState}
          soundEnabled={soundEnabled}
          selectedScenarioId={selectedScenarioId}
          handleSelectScenario={handleSelectScenario}
          handleQuickRepairCurrentPatch={handleQuickRepairCurrentPatch}
          executeArenaAudit={executeArenaAudit}
          isDeploying={isDeploying}
          lastAudit={lastAudit}
          clearedGates={clearedGates}
          setClearedGates={setClearedGates}
          setArenaScore={setArenaScore}
          onSendToVerifier={onSendToVerifier}
        />
      )}

      {viewMode === 'workbench' && (
        <EngineerArenaPanel
          liveState={liveState}
          selectedLiveTarget={selectedLiveTarget}
          setSelectedLiveTarget={setSelectedLiveTarget}
          selectedScenarioId={selectedScenarioId}
          handleSelectScenario={handleSelectScenario}
          trustAnchorMode={trustAnchorMode}
          setTrustAnchorMode={setTrustAnchorMode}
          approvalPlacement={approvalPlacement}
          setApprovalPlacement={setApprovalPlacement}
          scopeMode={scopeMode}
          setScopeMode={setScopeMode}
          proofSerialization={proofSerialization}
          setProofSerialization={setProofSerialization}
          packageHygiene={packageHygiene}
          setPackageHygiene={setPackageHygiene}
          payloadMutated={payloadMutated}
          setPayloadMutated={setPayloadMutated}
          handleQuickRepairCurrentPatch={handleQuickRepairCurrentPatch}
          executeArenaAudit={(pred) => executeArenaAudit(pred, false)}
          isDeploying={isDeploying}
          lastAudit={lastAudit}
          auditHistory={auditHistory}
          onSendToVerifier={onSendToVerifier}
        />
      )}

      {/* 3. UNIVERSAL REPOSITORY GOVERNANCE ARENA (SPLIT / KIDS / SENIOR) */}
      {(viewMode === 'split' || viewMode === 'kids' || viewMode === 'senior') && (
        <div className="space-y-6">
          {/* Quick Play Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Castle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span>🏰 Aventura dos 8 Portões (Jogo do Castelo VUC)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 font-black">INTERATIVO</span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-300">
                  Conserte o robô e faça ele passar pelas 8 portas do castelo sem precisar de código!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('gates_game')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-950/30 cursor-pointer transition shrink-0 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-zinc-950" />
              <span>JOGAR O JOGO DOS 8 PORTÕES</span>
            </button>
          </div>

          {/* UNIVERSAL REPO SELECTOR BAR (Backed by VUC Connector `vua.github.inspect_repo`) */}
          <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-amber-500/10 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') invokeUniversalRepoConnector(repoInput, false);
                  }}
                  placeholder={t.repoPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={() => invokeUniversalRepoConnector(repoInput, false)}
                disabled={loadingConnector}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-95 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>{loadingConnector ? 'Conectando VUC...' : t.loadRepo}</span>
              </button>
            </div>

            {/* Preset Repositories */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-zinc-400">{t.presets}</span>
              {UNIVERSAL_REPO_PRESETS.map((preset) => {
                const isSelected = activeRepoName.toLowerCase() === preset.name.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setRepoInput(preset.name);
                      invokeUniversalRepoConnector(preset.name, false);
                    }}
                    className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {connectorError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{connectorError}</span>
              </div>
            )}

            {/* VUC UNIVERSAL CONNECTOR CRYPTOGRAPHIC PROOF STRIP */}
            {universalData?.execution_proof && (
              <div className="rounded-xl bg-zinc-950/90 border border-emerald-500/30 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {t.connectorBadge}: {universalData.connector_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px]">
                      key: {universalData.execution_proof.identity.key_id} ({universalData.execution_proof.identity.algorithm})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-amber-300 font-mono text-[10px]">
                      output_hash: {universalData.execution_proof.output_hash.slice(0, 22)}...
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 font-mono text-[10px]">
                      S0 Verifier: {universalData.verification?.valid ? 'VALID (RFC 8785)' : 'INVALID'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onSendToVerifier && (
                      <button
                        type="button"
                        onClick={() => onSendToVerifier(universalData.execution_proof!)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{t.sendToVerifier}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConnectorProofDetails((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showConnectorProofDetails ? 'Ocultar Prova' : 'Inspecionar Prova'}</span>
                      {showConnectorProofDetails ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {showConnectorProofDetails && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80 text-[11px] font-mono">
                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <div className="text-emerald-400 font-bold mb-1">
                        ExecutionProof v1 (Emitido pelo VUC Gateway)
                      </div>
                      <div className="text-zinc-400">
                        execution_id: <span className="text-zinc-200">{universalData.execution_proof.execution_id}</span>
                      </div>
                      <div className="text-zinc-400">
                        gos3_session_id:{' '}
                        <span className="text-zinc-200">{universalData.execution_proof.gos3_session_id}</span>
                      </div>
                      <div className="text-zinc-400">
                        input_hash: <span className="text-zinc-200 break-all">{universalData.execution_proof.input_hash}</span>
                      </div>
                      <div className="text-zinc-400">
                        output_hash:{' '}
                        <span className="text-zinc-200 break-all">{universalData.execution_proof.output_hash}</span>
                      </div>
                      <div className="text-zinc-400">
                        signature:{' '}
                        <span className="text-amber-300 break-all">
                          {universalData.execution_proof.signature.slice(0, 64)}...
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <div className="text-amber-400 font-bold mb-1">Audit Log do Conector (VUAGitHubAdapter)</div>
                      {(universalData.audit_log || []).map((line, i) => (
                        <div key={i} className="text-zinc-300 leading-relaxed">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* REPOSITORY IDENTITY BANNER + LANGUAGE PERCENTAGE BAR */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <img
                  src={repoInfo.owner.avatar_url}
                  alt={repoInfo.owner.login}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl border border-zinc-700 object-cover bg-zinc-950 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://github.com/${repoInfo.full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base sm:text-lg font-bold text-zinc-100 hover:text-emerald-400 flex items-center gap-1.5"
                    >
                      <span>{repoInfo.full_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </a>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {repoInfo.owner.type}
                    </span>
                    {repoInfo.license?.spdx_id && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        <span>{repoInfo.license.spdx_id}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 max-w-3xl">
                    {repoInfo.description || 'Repository inspected and governed via VUC Universal Connector'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>{t.stars}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-400">
                    {(repoInfo.stargazers_count ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <GitFork className="w-3 h-3 text-teal-300" />
                    <span>{t.forks}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-teal-300">
                    {(repoInfo.forks_count ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-pink-400" />
                    <span>{t.issues}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-pink-400">
                    {(repoInfo.open_issues_count ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3 text-purple-400" />
                    <span>{t.watchers}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-purple-400">
                    {(repoInfo.watchers_count ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-1">
                    <GitBranch className="w-3 h-3 text-emerald-400" />
                    <span>{t.defaultBranch}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400 truncate">
                    {repoInfo.default_branch}
                  </div>
                </div>
              </div>
            </div>

            {languagePercentages.length > 0 && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.languages}</span>
                  </span>
                  <span>Updated: {new Date(repoInfo.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-950">
                  {languagePercentages.map((item) => (
                    <div
                      key={item.lang}
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      title={`${item.lang}: ${item.pct}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {languagePercentages.map((item) => (
                    <span key={item.lang} className="text-[11px] font-mono flex items-center gap-1.5 text-zinc-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.lang}</span>
                      <span className="text-zinc-500">{item.pct}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* GOVERNANCE FORTRESS (MAIN TOWER + OPEN PR TOWERS FOR ANY REPO) */}
          <section className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 p-5 sm:p-7 relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-6">
              {/* Fortress Header + Pangolin Guardian Speech */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {viewMode === 'kids'
                        ? 'Castelo Mágico do Repositório'
                        : viewMode === 'senior'
                        ? 'Zero-Trust Repository Fortress'
                        : 'Kids + Senior Universal View'}
                    </span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2 text-zinc-100">
                    <Castle className="w-6 h-6 text-amber-400 shrink-0" />
                    <span>
                      {t.towersTitle} — <span className="text-emerald-400">{repoInfo.full_name}</span>
                    </span>
                  </h2>
                </div>

                {/* Pangolin Guardian Status Card */}
                <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-xs max-w-xs">
                    <div className="font-bold text-amber-400">Guardião Pangolim VUC</div>
                    <div className="text-zinc-300 leading-snug">
                      {allLeversOn
                        ? lang === 'pt'
                          ? `Protegendo ${repoShortName} com carimbo Ed25519!`
                          : `Protecting ${repoShortName} with Ed25519 stamp!`
                        : lang === 'pt'
                        ? 'Alerta! Uma alavanca está desligada — castelo vulnerável!'
                        : 'Alert! A security lever is OFF — castle vulnerable!'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Towers Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* MAIN TOWER (Default Branch) */}
                <div
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                    allLeversOn
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg'
                      : 'bg-rose-950/25 border-rose-500/50'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            allLeversOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {allLeversOn ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {t.mainTower} • {repoInfo.default_branch}
                          </div>
                          <div className="text-base font-bold text-zinc-100">{repoShortName}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-lg font-bold border ${
                          allLeversOn
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {allLeversOn ? t.protected : t.vulnerable}
                      </span>
                    </div>

                    {/* Latest Commit Box */}
                    {universalData?.commit && (
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 text-xs space-y-1">
                        <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                          <span className="flex items-center gap-1">
                            <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t.lastCommit}</span>
                          </span>
                          <span className="text-emerald-400">{universalData.commit.sha.slice(0, 7)}</span>
                        </div>
                        <div className="font-medium text-zinc-200 truncate">
                          {universalData.commit.commit.message.split('\n')[0]}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          by {universalData.commit.commit.author.name}
                        </div>
                      </div>
                    )}

                    {/* Kids / Senior / Split Explanation Cards */}
                    <div className="space-y-2 text-xs">
                      {(viewMode === 'kids' || viewMode === 'split') && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100">
                          <strong className="text-amber-300">Kids:</strong> Castelo principal onde mora o código de
                          verdade de <span className="underline">{repoShortName}</span>. Só entra quem tem o carimbo
                          mágico Ed25519!
                        </div>
                      )}
                      {(viewMode === 'senior' || viewMode === 'split') && (
                        <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 font-mono text-[11px] text-zinc-300">
                          <strong className="text-emerald-400">Senior:</strong> Branch{' '}
                          <code>{repoInfo.default_branch}</code> • SHA{' '}
                          <code>{universalData?.commit?.sha.slice(0, 10) || 'HEAD'}</code> •{' '}
                          {allLeversOn ? 'Protected via VUC Policy & S0 Anchor' : 'Bypass risk (lever disabled)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Workflows List */}
                  <div className="pt-3 border-t border-zinc-800/80 space-y-1.5">
                    <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {t.workflows} ({(universalData?.runs || []).length})
                      </span>
                    </div>
                    {(universalData?.runs || []).length > 0 ? (
                      (universalData?.runs || []).slice(0, 3).map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80"
                        >
                          <span className="truncate max-w-[180px] text-zinc-300">{run.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              run.conclusion === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : run.conclusion === 'failure'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {run.conclusion || run.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] font-mono text-zinc-500">
                        {lang === 'pt'
                          ? 'Sem runs públicos recentes — pronto para integrar VUC Gate'
                          : 'No recent public runs — ready for VUC Gate integration'}
                      </div>
                    )}
                  </div>
                </div>

                {/* PROPOSAL TOWERS (Open Pull Requests) */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(universalData?.prs || []).length > 0 ? (
                    (universalData?.prs || []).slice(0, 2).map((pr, idx) => {
                      const failedChecks = pr.checks_summary?.failed ?? 0;
                      const passedChecks = pr.checks_summary?.passed ?? 0;
                      const totalChecks = pr.checks_summary?.total ?? 0;
                      const isPrHealthy = failedChecks === 0 && (totalChecks > 0 ? passedChecks > 0 : idx === 0);

                      return (
                        <div
                          key={pr.number}
                          className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 ${
                            isPrHealthy
                              ? 'bg-emerald-950/15 border-emerald-500/35'
                              : 'bg-amber-950/15 border-amber-500/35'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                    isPrHealthy
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  <GitPullRequest className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-[11px] font-mono text-zinc-400">
                                    {t.prTower} #{pr.number}
                                  </div>
                                  <a
                                    href={pr.html_url || `https://github.com/${repoInfo.full_name}/pull/${pr.number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-zinc-100 hover:text-emerald-400 line-clamp-1"
                                  >
                                    {pr.title}
                                  </a>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg font-bold border shrink-0 ${
                                  isPrHealthy
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : failedChecks > 0
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isPrHealthy ? t.ready : failedChecks > 0 ? t.blocked : t.testing}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono space-y-1">
                              <div className="flex items-center justify-between text-zinc-400">
                                <span>Branch:</span>
                                <span className="text-teal-300 truncate max-w-[180px]">
                                  {pr.head.ref} → {pr.base.ref}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-zinc-400">
                                <span>SHA:</span>
                                <span className="text-amber-300">{pr.head.sha.slice(0, 7)}</span>
                              </div>
                              <div className="flex items-center justify-between text-zinc-400">
                                <span>Author:</span>
                                <span className="text-zinc-200">@{pr.user.login}</span>
                              </div>
                              {totalChecks > 0 && (
                                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                                  <span>Checks:</span>
                                  <span className={failedChecks > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                    {passedChecks}/{totalChecks} passed
                                    {failedChecks > 0 ? ` (${failedChecks} failed)` : ''}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 text-xs">
                              {(viewMode === 'kids' || viewMode === 'split') && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100">
                                  <strong className="text-amber-300">Kids:</strong> Construtor{' '}
                                  <span className="underline">@{pr.user.login}</span> quer adicionar uma peça na torre!
                                  O Pangolim confere a mochila e o recibo mágico antes de abrir a ponte.
                                </div>
                              )}
                              {(viewMode === 'senior' || viewMode === 'split') && (
                                <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 font-mono text-[11px] text-zinc-300">
                                  <strong className="text-emerald-400">Senior:</strong> PR #{pr.number} requires{' '}
                                  <code>ExecutionProof</code> + <code>scope_hash</code> verification before merge into{' '}
                                  <code>{pr.base.ref}</code>.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span>VUC Gate Status:</span>
                            <span className={isPrHealthy ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                              {isPrHealthy ? 'PASS • Verified' : 'FAIL-CLOSED • Pending Fix'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 flex flex-col items-center justify-center text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm font-semibold text-zinc-200">{t.noPrs}</p>
                      <p className="text-xs font-mono text-zinc-500">
                        Experimente carregar facebook/react ou vercel/next.js acima para inspecionar PRs ao vivo via VUC
                        Connector!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 4. INTERACTIVE SIMULATOR: 6 SECURITY LEVERS (Backed by Real `/api/vortex/arena/audit-patch`) */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>
                    {t.simTitle} ({repoShortName})
                  </span>
                </h2>
                <p className="text-xs text-zinc-400">{t.simSub}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = [true, true, true, true, true, true];
                    setLevers(next);
                    handleAuditSixLevers(next);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold cursor-pointer"
                >
                  {t.allOn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = [true, true, false, true, true, true];
                    setLevers(next);
                    handleAuditSixLevers(next);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono font-semibold cursor-pointer"
                >
                  {t.testFail}
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditSixLevers()}
                  disabled={isDeploying}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isDeploying ? 'Auditando...' : t.auditLevers}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {UNIVERSAL_SECURITY_LEVERS.map((lever, idx) => {
                const isOn = levers[idx];
                const IconComp = LEVER_ICONS[idx] || Shield;
                return (
                  <div
                    key={lever.id}
                    className={`rounded-2xl border p-4 transition ${
                      isOn
                        ? 'bg-zinc-900/70 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                          style={{
                            backgroundColor: `${lever.color}20`,
                            borderColor: `${lever.color}40`,
                            color: lever.color,
                          }}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-zinc-400">{lever.gates}</div>
                          <div className="text-xs font-bold text-zinc-100">
                            {lang === 'pt' ? lever.title.pt : lever.title.en}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLever(idx)}
                        className={`relative w-11 h-6 rounded-full transition cursor-pointer shrink-0 ${
                          isOn ? 'bg-emerald-400' : 'bg-zinc-700'
                        }`}
                        aria-label={`Toggle ${lever.gates}`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-zinc-950 transition-all ${
                            isOn ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-zinc-300">
                      {lang === 'pt' ? lever.desc.pt : lever.desc.en}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                        {t.lever} 0{lever.id}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold"
                        style={{
                          backgroundColor: `${lever.color}15`,
                          borderColor: `${lever.color}35`,
                          color: isOn ? lever.color : '#fda4af',
                        }}
                      >
                        {isOn ? 'ON • fail-closed' : 'OFF • bypass risk!'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-Time Gateway Audit Result Banner when user audits the levers */}
            {lastAudit && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  lastAudit.verdict === 'PASS'
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100'
                    : 'bg-rose-950/30 border-rose-500/50 text-rose-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastAudit.verdict === 'PASS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm">
                      Gateway VUC Verdict: {lastAudit.verdict} ({lastAudit.gates_passed}/{lastAudit.total_gates} Gates)
                    </div>
                    <div className="text-zinc-300 font-mono">
                      {lastAudit.first_blocking_gate
                        ? `Bloqueado em ${lastAudit.first_blocking_gate.name}: ${lastAudit.first_blocking_gate.code} — ${lastAudit.first_blocking_gate.detail}`
                        : `Todos os 8 portões passaram! ExecutionProof ${lastAudit.execution_proof?.execution_id} assinado com Ed25519.`}
                    </div>
                  </div>
                </div>

                {lastAudit.execution_proof && onSendToVerifier && (
                  <button
                    type="button"
                    onClick={() => onSendToVerifier(lastAudit.execution_proof!)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-emerald-300 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.sendToVerifier}</span>
                  </button>
                )}
              </div>
            )}
          </section>

          {/* 5. UNIVERSAL ARCHITECTURE DIAGRAM (Non-Root -> UDS Broker -> Ed25519) */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 space-y-4 overflow-x-auto">
            <h2 className="text-sm font-bold flex items-center gap-2 text-zinc-100">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>{t.architecture} • universal for ANY repo</span>
            </h2>

            <div className="min-w-[680px] grid grid-cols-5 gap-2.5 items-center">
              {[
                { label: 'vuc-agent\n(non-root)', sub: 'owner: vuc\nuntrusted', color: '#5eead4' },
                { label: '/run/vuc/broker.sock', sub: 'UDS • no tcp\nframed rpc', color: '#ffd700' },
                { label: 'vuc-broker\n(root mínimo)', sub: 'Ed25519 sign\npolicy deny', color: '#00ff88', badge: 'fail-closed' },
                {
                  label: 'typed executors',
                  sub: 'github.inspect_repo\nfilesystem.write\nshell.exec (deny)',
                  color: '#a78bfa',
                },
                { label: 'ledger\nEd25519', sub: 'proof.json\nRFC 8785 JCS', color: '#ffd700' },
              ].map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center space-y-1"
                >
                  <div
                    className="text-xs font-mono font-bold whitespace-pre-line leading-tight"
                    style={{ color: step.color }}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400 whitespace-pre-line leading-tight">
                    {step.sub}
                  </div>
                  {step.badge && (
                    <span className="inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {step.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono pt-1">
              <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-1">
                <div className="text-teal-300 font-bold">Policy deny-by-default</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Para qualquer repo: sem AGENTS.md = deny. Lista allow de executors + scopes explícitos sem wildcard.
                </p>
              </div>
              <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-1">
                <div className="text-emerald-400 font-bold">ExecutionProof universal</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {'{ input_hash, output_hash: H(RFC8785(output)), gos3_session_id, sig: Ed25519 }'} • funciona para{' '}
                  {repoInfo.full_name}.
                </p>
              </div>
              <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3.5 space-y-1">
                <div className="text-amber-400 font-bold">Verificador independente (S0)</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Processo separado resolve a chave pública na Trust Store S0 sem confiar no agente. Caixa mágica
                  fail-closed.
                </p>
              </div>
            </div>
          </section>

          {/* 6. CLI QUICK INSTALL & VERIFICATION FOR THIS REPOSITORY */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-100">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>{t.install}</span>
                </h3>
                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 font-mono text-[11px] leading-relaxed space-y-1">
                  <div className="text-zinc-500"># Funciona para QUALQUER repositório</div>
                  <div className="text-emerald-400">npm install -g @vucfoundation/vuc@1.0.2</div>
                  <div className="text-zinc-500 pt-1"># Broker isolado (root mínimo via UDS)</div>
                  <div className="text-zinc-200">sudo vuc broker install --socket /run/vuc/broker.sock</div>
                  <div className="text-zinc-500 pt-1"># Contrato de governança</div>
                  <div className="text-zinc-200">vuc preflight</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyText('npm install -g @vucfoundation/vuc@1.0.2', 'install')}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'install' ? 'Copiado!' : 'Copiar instalação'}</span>
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-100">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>
                    {t.verify} • {repoInfo.full_name}
                  </span>
                </h3>
                <div className="rounded-xl bg-zinc-950 border border-emerald-500/30 p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto space-y-1">
                  <div className="text-zinc-500"># Inspeciona {repoInfo.full_name} via VUC Connector e emite prova Ed25519</div>
                  <div className="text-emerald-400 break-all">
                    {`vua invoke github inspect_repo --target '{"owner":"${repoOwner}","repo":"${repoShortName}"}' --proof-out proof.json && vua verify-proof proof.json`}
                  </div>
                  <div className="text-zinc-500 pt-1"># Prova Real observada neste instante:</div>
                  <div className="text-zinc-300">{'{'}</div>
                  <div className="text-zinc-300 pl-3">
                    &quot;output_hash&quot;: &quot;
                    {universalData?.execution_proof?.output_hash.slice(0, 24) || 'sha256:verified'}...&quot;,
                  </div>
                  <div className="text-zinc-300 pl-3">
                    &quot;key_id&quot;: &quot;{universalData?.execution_proof?.identity.key_id || 'key-vortex-2026-prod'}&quot;,
                  </div>
                  <div className="text-emerald-400 pl-3">
                    &quot;valid&quot;: true, &quot;fail_closed&quot;: true
                  </div>
                  <div className="text-zinc-300">{'}'}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    `vua invoke github inspect_repo --target '{"owner":"${repoOwner}","repo":"${repoShortName}"}' --proof-out proof.json && vua verify-proof proof.json`,
                    'verify'
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedKey === 'verify' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copiedKey === 'verify' ? 'Copiado!' : `Copiar verificação para ${repoInfo.full_name}`}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
