import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Search,
  Lock,
  Cpu,
  ExternalLink,
  Eye,
  FileCheck,
  GitFork,
  Hammer,
  Hash,
  Layers,
  Split,
  Star,
  Terminal,
  WandSparkles,
  Zap,
  Copy,
  Check,
  BookOpen,
  Package,
  Play,
} from 'lucide-react';
import type { ExecutionProof } from '../../vortex/types.js';
import { playCastleSound } from './arenaGameData.js';

const TRANSLATIONS = {
  pt: {
    title: 'VUC Universal Governance Arena',
    subtitle: 'Game para QUALQUER Repo (Conectado ao VUC GitHub Adapter)',
    inputLabel: 'Cole qualquer repo GitHub: owner/repo (via Conector VUC)',
    placeholder: 'ex: facebook/react, vercel/next.js, scoobiii/vuc',
    fetch: 'Invocar Castelo (Conector VUC)',
    examples: 'Exemplos:',
    loading: 'Invocando Conector VUC (vua.github.inspect_repo)...',
    kids: 'Crianças',
    senior: 'Sênior',
    split: 'Dividido',
    stepByStep: 'Jogar os 8 Portões (Passo a Passo)',
    mainTower: 'TORRE PRINCIPAL',
    prTowers: 'Torres de Proposta (PRs)',
    missions: '6 Missões Vivas — Detectadas no seu repo',
    workbench: 'Bancada de Correção — 6 Alavancas = 8 Portões VUC',
    autoFix: 'Auto-Fix Universal (Conector VUC)',
    architecture: 'Arquitetura Universal VUC Broker',
    install: 'Instalação Universal',
    verify: 'Verificação Universal via Conector',
    magicBox: 'Caixa Mágica de Tarefas',
    magicDesc:
      'Você pede algo (proposta). A caixa só entrega o prêmio se mostrar o carimbo secreto (ExecutionProof) e o desenho bater no hash. Sem prova? Não abre. Fail-closed. Isso funciona para QUALQUER repo.',
    commit: 'Commit',
    status: 'Status',
    languages: 'Linguagens',
    openPRs: 'PRs Abertos',
    lastCheck: 'Último Check',
    missionFix: 'Aplicar Correção',
    fixed: 'Corrigido!',
    gate: 'Portão',
    lever: 'Alavanca',
    universalBadge: 'Works with ANY repo • VUC Connector Active',
  },
  en: {
    title: 'VUC Universal Governance Arena',
    subtitle: 'Game for ANY Repo (Powered by VUC GitHub Adapter)',
    inputLabel: 'Paste any GitHub repo: owner/repo (via VUC Connector)',
    placeholder: 'e.g: facebook/react, vercel/next.js, scoobiii/vuc',
    fetch: 'Invoke Castle (VUC Connector)',
    examples: 'Examples:',
    loading: 'Invoking VUC Connector (vua.github.inspect_repo)...',
    kids: 'Kids',
    senior: 'Senior',
    split: 'Split',
    stepByStep: 'Play 8 Gates (Step-by-Step)',
    mainTower: 'MAIN TOWER',
    prTowers: 'Proposal Towers (PRs)',
    missions: '6 Live Missions — Detected in your repo',
    workbench: 'Patch Workbench — 6 Levers = 8 VUC Gates',
    autoFix: 'Universal Auto-Fix (VUC Connector)',
    architecture: 'Universal VUC Broker Architecture',
    install: 'Universal Installation',
    verify: 'Universal Connector Verification',
    magicBox: 'Magic Task Box',
    magicDesc:
      'You request something (proposal). The box only delivers the prize if it shows the secret stamp (ExecutionProof) and drawing matches hash. No proof? No open. Fail-closed. Works for ANY repo.',
    commit: 'Commit',
    status: 'Status',
    languages: 'Languages',
    openPRs: 'Open PRs',
    lastCheck: 'Last Check',
    missionFix: 'Apply Fix',
    fixed: 'Fixed!',
    gate: 'Gate',
    lever: 'Lever',
    universalBadge: 'Works with ANY repo • VUC Connector Active',
  },
};

interface UniversalRepoResponse {
  repo: any;
  languages: Record<string, number>;
  commit: any;
  prs: any[];
  runs: any[];
  connector_id?: string;
  external_effect?: string;
  audit_log?: string[];
  execution_proof?: ExecutionProof | null;
  verification?: { valid: boolean; reasons?: string[] } | null;
}

interface UniversalRepoArenaPanelProps {
  soundEnabled: boolean;
  onStartStepByStepGame: () => void;
  onSendToVerifier?: (proof: ExecutionProof) => void;
  onTriggerRealAudit?: () => Promise<void>;
}

export const UniversalRepoArenaPanel: React.FC<UniversalRepoArenaPanelProps> = ({
  soundEnabled,
  onStartStepByStepGame,
  onSendToVerifier,
  onTriggerRealAudit,
}) => {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [viewMode, setViewMode] = useState<'kids' | 'senior' | 'split'>('split');
  const [repoInput, setRepoInput] = useState<string>('scoobiii/vuc');
  const [repoState, setRepoState] = useState<UniversalRepoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [levers, setLevers] = useState<boolean[]>([false, false, false, false, false, false]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoFixBanner, setAutoFixBanner] = useState<boolean>(false);

  const m = TRANSLATIONS[lang];

  const invokeUniversalRepoConnector = useCallback(
    async (rawInput: string) => {
      const cleaned = rawInput
        .trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .split('/')
        .slice(0, 2)
        .join('/');

      if (!cleaned.includes('/')) {
        setErrorMsg(lang === 'pt' ? 'Formato inválido. Use owner/repo' : 'Invalid format. Use owner/repo');
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Primary path: invoke our governed VUC GitHub Connector backend endpoint
        const res = await fetch('/api/vortex/arena/universal-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo: cleaned }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.repo) {
            setRepoState({
              repo: data.repo,
              languages: data.languages || {},
              commit: data.commit || null,
              prs: data.prs || [],
              runs: data.runs || [],
              connector_id: data.connector_id || 'vua.github.inspect_repo',
              external_effect: data.external_effect || 'remote_confirmed',
              audit_log: data.audit_log || [],
              execution_proof: data.execution_proof || null,
              verification: data.verification || null,
            });
            setLevers([false, false, false, false, false, false]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to direct GitHub public API if running standalone on static GitHub Pages
      }

      try {
        const [owner, repo] = cleaned.split('/');
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoRes.ok) {
          throw new Error(`Repo não encontrado (${repoRes.status})`);
        }
        const repoData = await repoRes.json();
        const [languages, prs, runsData] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}/languages`).then((r) => (r.ok ? r.json() : {})),
          fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=3&sort=created&direction=desc`).then(
            (r) => (r.ok ? r.json() : [])
          ),
          fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5`).then((r) =>
            r.ok ? r.json() : { workflow_runs: [] }
          ),
        ]);

        let latestCommit = null;
        try {
          const cRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?sha=${repoData.default_branch}&per_page=1`
          );
          if (cRes.ok) {
            latestCommit = (await cRes.json())[0] || null;
          }
        } catch {
          // ignore commit fetch error
        }

        setRepoState({
          repo: repoData,
          languages,
          commit: latestCommit,
          prs,
          runs: runsData.workflow_runs || [],
          connector_id: 'vua.github.inspect_repo (public-fallback)',
          external_effect: 'remote_confirmed',
        });
        setLevers([false, false, false, false, false, false]);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao buscar repositório');
        setRepoState(null);
      } finally {
        setLoading(false);
      }
    },
    [lang]
  );

  useEffect(() => {
    invokeUniversalRepoConnector('scoobiii/vuc');
  }, [invokeUniversalRepoConnector]);

  // Dynamic 6 Missions tailored to the inspected repository's language stack
  const liveMissions = (() => {
    if (!repoState) return [];
    const langKeys = Object.keys(repoState.languages || {});
    const primaryLang = (repoState.repo?.language || langKeys[0] || 'Unknown').toLowerCase();
    const hasTs =
      primaryLang.includes('typescript') || langKeys.some((k) => k.toLowerCase().includes('typescript'));
    const hasJs =
      primaryLang.includes('javascript') ||
      langKeys.some((k) => k.toLowerCase().includes('javascript')) ||
      hasTs;
    const hasPy =
      primaryLang.includes('python') || langKeys.some((k) => k.toLowerCase().includes('python'));

    return [
      {
        id: 's0',
        gate: 'Gate 02 · S0 Trust Anchor',
        gateNum: 2,
        leverIdx: 1,
        severity: 'critical' as const,
        cveLike: 'CVE-VUC-S0',
        title: { pt: 'Ladrão de Chave (Chave Falsa)', en: 'Key Thief (Caller Key)' },
        kid: {
          pt: 'Alguém tentou abrir o portão com uma chave que veio pela carta! Sem checar no cofre do Rei, qualquer impostor entra.',
          en: 'Someone tried to open the gate with a key sent in a letter! Without checking the royal vault, any impostor enters.',
        },
        senior: {
          pt: 'Caller key injection: embeddedPublicKey sem âncora independente. Fix: Ed25519 caller_id + resolução estrita via Trust Store.',
          en: 'Caller key injection: unanchored embeddedPublicKey. Fix: Ed25519 caller_id + strict Trust Store resolution.',
        },
        fix: { pt: 'Trocar Cofre: Ed25519 Trust Store', en: 'Swap Vault: Ed25519 Trust Store' },
      },
      {
        id: 's1',
        gate: 'Gate 03 · GOS3 Scope',
        gateNum: 3,
        leverIdx: 2,
        severity: 'critical' as const,
        cveLike: 'CVE-VUC-S1',
        title: { pt: 'Polvo Estrela * (Castelo Inteiro)', en: 'Star Octopus * (Wildcard Scope)' },
        kid: {
          pt: 'O polvo com braço * quer pegar o castelo inteiro na mochila! O guardião só permite levar o pacote da missão.',
          en: 'The octopus arm * tries to grab the whole castle! The guardian only allows the mission package.',
        },
        senior: {
          pt: 'Wildcard scope: capability.scope = ["*"]. Viola privilégio mínimo. Fix: scope_hash = H(canonical(capability)) + deny-by-default.',
          en: 'Wildcard scope: capability.scope = ["*"]. Violates least privilege. Fix: scope_hash = H(canonical(capability)) + deny-by-default.',
        },
        fix: { pt: 'Escopo Limitado: scope_hash', en: 'Limited Scope: scope_hash' },
      },
      {
        id: 's2',
        gate: 'Gate 04 · Approval Binding',
        gateNum: 4,
        leverIdx: 2,
        severity: 'critical' as const,
        cveLike: 'CVE-VUC-S2',
        title: { pt: 'Fantasma que Muda o Pacote', en: 'Post-Approval Payload Ghost' },
        kid: {
          pt: 'O Rei aprovou um desenho de gatinho e pôs o lacre, mas um fantasma trocou por um dinossauro depois! O lacre quebrou.',
          en: 'The King approved a kitten drawing and sealed it, but a ghost swapped it for a dinosaur afterwards!',
        },
        senior: {
          pt: 'Payload mutation post-approval: approved_payload hash != executed payload. Fix: payload_hash = SHA256(RFC8785(payload)) + approval_token.',
          en: 'Payload mutation post-approval: approved_payload hash != executed payload. Fix: payload_hash = SHA256(RFC8785(payload)) + approval_token.',
        },
        fix: { pt: 'Desenho Travado: payload_hash', en: 'Locked Drawing: payload_hash' },
      },
      {
        id: 'g08',
        gate: 'Gate 08 · Independent Verifier',
        gateNum: 8,
        leverIdx: 5,
        severity: 'high' as const,
        cveLike: 'CVE-VUC-08',
        title: {
          pt: hasJs ? 'Fantasma \\n no Recibo JSON' : 'Pergaminho com \\n Escondido',
          en: hasJs ? '\\n Ghost in Proof JSON' : 'Hidden \\n in Scroll',
        },
        kid: {
          pt: hasJs
            ? `No ${primaryLang} deixaram um rabisco \\n no fim do Recibo Mágico! A lupa do segundo guardião não consegue ler.`
            : 'Tem um rabisco invisível no final do Recibo Mágico! A lupa do fiscal trava na leitura.',
          en: hasJs
            ? `In ${primaryLang} a trailing \\n scribble breaks the Magic Receipt JSON! The second guardian cannot read it.`
            : 'Invisible \\n scribble in scroll! Parser breaks.',
        },
        senior: {
          pt: `Gate 08: Literal \\\\n após o JSON em --proof-out (${primaryLang}). Quebra o parser do Verificador Independente. Fix: RFC 8785 canonical JSON + newline limpo.`,
          en: `Gate 08: Trailing literal \\\\n in --proof-out (${primaryLang}). Breaks Independent Verifier JSON parser. Fix: RFC 8785 canonical JSON.`,
        },
        fix: { pt: 'Recibo Limpo: RFC 8785 JSON', en: 'Clean Receipt: RFC 8785 JSON' },
      },
      {
        id: 'g06',
        gate: 'Gate 06 · Package Hygiene',
        gateNum: 6,
        leverIdx: 4,
        severity: 'medium' as const,
        cveLike: 'CVE-VUC-06',
        title: {
          pt: hasPy ? 'Lixo .pyc Escondido na Mochila' : 'Sujeira Escondida na Mochila',
          en: hasPy ? 'Leaked .pyc Trash in Backpack' : 'Leaked Build Trash in Package',
        },
        kid: {
          pt: hasPy
            ? 'Papel amassado (__pycache__ e .pyc) esquecido dentro da mochila! O Raio-X apitou: limpe a mochila antes de entrar.'
            : 'Rascunhos sujos vazando dentro da caixa de presente! Precisa limpar a mochila.',
          en: hasPy
            ? '__pycache__ and .pyc trash left inside the backpack! Clean the package before entering.'
            : 'Build cache leaking inside package! Clean the backpack.',
        },
        senior: {
          pt: `Gate 06: ${hasPy ? '__pycache__, *.pyc' : 'cache/artifacts não listados'} no tarball npm pack. Fix: package allowlist + higienização pré-pack.`,
          en: `Gate 06: ${hasPy ? '__pycache__, *.pyc' : 'unlisted cache artifacts'} in tarball. Fix: strict files allowlist + pre-pack hygiene.`,
        },
        fix: { pt: 'Mochila Limpa: allowlist', en: 'Clean Backpack: allowlist' },
      },
      {
        id: 'g05',
        gate: hasTs ? 'Gate 05 · TS Contract' : 'Gate 01 · Governance Contract',
        gateNum: hasTs ? 5 : 1,
        leverIdx: hasTs ? 3 : 0,
        severity: hasTs ? ('high' as const) : ('medium' as const),
        cveLike: hasTs ? 'CVE-VUC-05' : 'CVE-VUC-01',
        title: {
          pt: hasTs ? 'Peça Encaixada no Lugar Errado' : 'Sem Livro de Regras do Castelo',
          en: hasTs ? 'Piece in the Wrong Slot (TS2353)' : 'Missing Castle Rulebook',
        },
        kid: {
          pt: hasTs
            ? 'A Permissão do Rei foi guardada dentro do bolso do Crachá! As peças não encaixam assim.'
            : 'Sem o Livro de Legras do Castelo (AGENTS.md), ninguém sabe o que é permitido!',
          en: hasTs
            ? 'The Royal Permission was stuffed inside the Badge pocket! Pieces do not fit that way.'
            : 'Without the Castle Rulebook (AGENTS.md), no one knows the rules!',
        },
        senior: {
          pt: hasTs
            ? 'Gate 05: TS2353 approval_token dentro de AuthorizationContext em vez da raiz de VortexRequest. Fix: contrato estrito TypeScript.'
            : 'Gate 01: Sem AGENTS.md normativo. Fix: carregar e validar marcadores de governança.',
          en: hasTs
            ? 'Gate 05: TS2353 approval_token nested inside AuthorizationContext instead of VortexRequest root.'
            : 'Gate 01: Missing normative AGENTS.md contract.',
        },
        fix: {
          pt: hasTs ? 'Peça no Lugar Certo: VortexRequest' : 'Livro de Regras: AGENTS.md',
          en: hasTs ? 'Right Slot: VortexRequest' : 'Rulebook: AGENTS.md',
        },
      },
    ];
  })();

  const LEVER_DEFS = [
    {
      id: 1,
      gates: 'Gate 01 · Governance Contract',
      title: { pt: 'Livro de Regras (AGENTS.md)', en: 'Rulebook (AGENTS.md)' },
      desc: {
        pt: 'AGENTS.md + política fail-closed. Define o que pode e não pode para qualquer repositório.',
        en: 'AGENTS.md + fail-closed policy. Defines what is allowed for any repository.',
      },
      icon: BookOpen,
    },
    {
      id: 2,
      gates: 'Gate 02 · S0 Trust Anchor',
      title: { pt: 'Chave Verdadeira do Rei (S0)', en: 'Master Trust Store (S0)' },
      desc: {
        pt: 'Resolve chaves públicas exclusivamente do cofre oficial (Trust Store). Rejeita chaves vindas pela carta.',
        en: 'Resolves public keys strictly from the independent Trust Store. Rejects caller-supplied keys.',
      },
      icon: Lock,
    },
    {
      id: 3,
      gates: 'Gate 03 Scope + Gate 04 Lacre',
      title: { pt: 'Mochila Certa + Lacre Intacto', en: 'Bounded Scope + Sealed Hash' },
      desc: {
        pt: 'Escopo restrito ao pacote da missão (sem *) + lacre SHA-256 amarrado à Permissão do Rei.',
        en: 'Bounded repository scope (no *) + SHA-256 payload hash bound to approval.',
      },
      icon: Shield,
    },
    {
      id: 4,
      gates: 'Gate 05 · TypeScript Contract',
      title: { pt: 'Peça no Lugar Certo (Contrato)', en: 'Strict Type Contract (TS)' },
      desc: {
        pt: 'Permissão do Rei encaixada na raiz do pedido (sem erro TS2353 dentro do crachá).',
        en: 'Approval token placed at VortexRequest root (zero TS2353 schema drift).',
      },
      icon: CheckCircle2,
    },
    {
      id: 5,
      gates: 'Gate 06 Hygiene + Gate 07 Gateway',
      title: { pt: 'Mochila Limpa + Sala Protegida', en: 'Clean Package + Real Gateway' },
      desc: {
        pt: 'Mochila sem lixo .pyc escondido + execução real no VUC Sandbox emitindo Recibo Mágico.',
        en: 'Zero leaked .pyc cache + real execution inside VUC Sandbox emitting ExecutionProof.',
      },
      icon: Package,
    },
    {
      id: 6,
      gates: 'Gate 08 · Independent Verifier',
      title: { pt: 'Segundo Guardião (Lupa Ed25519)', en: 'Independent Verifier (RFC 8785)' },
      desc: {
        pt: 'Outro guardião confere o Recibo Mágico sem rabiscos \\n no final. 8/8 Portões Abertos!',
        en: 'Independent verifier checks the Magic Receipt with clean JSON and Ed25519 signature.',
      },
      icon: FileCheck,
    },
  ];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleUniversalAutoFix = async () => {
    playCastleSound('castle_victory', soundEnabled);
    setLevers([true, true, true, true, true, true]);
    setAutoFixBanner(true);
    if (onTriggerRealAudit) {
      await onTriggerRealAudit();
    }
    setTimeout(() => setAutoFixBanner(false), 3500);
  };

  const toggleSingleLever = (idx: number) => {
    const next = [...levers];
    next[idx] = !next[idx];
    setLevers(next);
    if (next.every(Boolean)) {
      playCastleSound('castle_victory', soundEnabled);
      if (onTriggerRealAudit) {
        onTriggerRealAudit();
      }
    } else {
      playCastleSound(next[idx] ? 'gate_open' : 'click', soundEnabled);
    }
  };

  const activeLeversCount = levers.filter(Boolean).length;
  const allLeversGreen = activeLeversCount === 6;

  return (
    <div className="space-y-8">
      {/* Sub-Header Controls: PT/EN + Kids / Senior / Split + Play 8 Gates CTA */}
      <section className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-semibold text-zinc-100">{m.title}</h2>
            <span className="text-xs font-mono text-emerald-400">· {m.universalBadge}</span>
          </div>
          <p className="text-xs text-zinc-400">{m.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* PT / EN */}
          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1">
            <button
              type="button"
              onClick={() => setLang('pt')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                lang === 'pt' ? 'bg-zinc-200 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              PT
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                lang === 'en' ? 'bg-zinc-200 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              EN
            </button>
          </div>

          {/* Kids / Senior / Split */}
          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-1">
            {[
              { id: 'kids' as const, icon: Eye, label: m.kids },
              { id: 'senior' as const, icon: Terminal, label: m.senior },
              { id: 'split' as const, icon: Split, label: m.split },
            ].map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewMode(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    viewMode === item.id
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Button to launch the 8-Gate Step-by-Step Story Adventure */}
          <button
            type="button"
            onClick={onStartStepByStepGame}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{m.stepByStep}</span>
          </button>
        </div>
      </section>

      {/* Universal Repo Input Bar (Powered by VUC Connector) */}
      <section className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-mono text-zinc-400 block">{m.inputLabel}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && invokeUniversalRepoConnector(repoInput)}
                  placeholder={m.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 font-mono text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => invokeUniversalRepoConnector(repoInput)}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>{m.fetch}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
              <span className="text-zinc-500">{m.examples}</span>
              {['scoobiii/vuc', 'facebook/react', 'vercel/next.js', 'microsoft/vscode', 'python/cpython'].map(
                (ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setRepoInput(ex);
                      invokeUniversalRepoConnector(ex);
                    }}
                    className={`px-2.5 py-1 rounded-md border transition cursor-pointer ${
                      repoInput === ex
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {ex}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Active Repo Summary Card */}
          {repoState?.repo && (
            <div className="lg:w-80 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
              {repoState.repo.owner?.avatar_url && (
                <img
                  src={repoState.repo.owner.avatar_url}
                  alt={repoState.repo.full_name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-zinc-100 truncate">
                  {repoState.repo.full_name}
                </div>
                <div className="text-xs text-zinc-400 line-clamp-1">
                  {repoState.repo.description || 'Repository inspected via VUC Connector'}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-zinc-300 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    {repoState.repo.stargazers_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5 text-zinc-400" />
                    {repoState.repo.forks_count}
                  </span>
                  <span className="text-emerald-400">{repoState.repo.language || 'Multi'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real VUC Connector ExecutionProof Strip */}
        {repoState?.execution_proof && (
          <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2 text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-semibold">
                Conector Ativo: {repoState.connector_id}
              </span>
              <span aria-hidden="true">·</span>
              <span>key_id: {repoState.execution_proof.identity.key_id}</span>
              <span aria-hidden="true">·</span>
              <span>proof_hash: {repoState.execution_proof.proof_hash?.slice(0, 18)}...</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">
                verifier: {repoState.verification?.valid ? 'PASS (Ed25519)' : 'CHECKED'}
              </span>
            </div>
            {onSendToVerifier && (
              <button
                type="button"
                onClick={() => onSendToVerifier(repoState.execution_proof!)}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
              >
                Inspecionar Recibo do Conector no Verificador →
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/60 text-rose-200 text-xs font-mono">
            {errorMsg}
          </div>
        )}
      </section>

      {/* Caixa Mágica de Tarefas • Universal Governance */}
      <section className="p-5 rounded-2xl bg-zinc-900/70 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-amber-400" />
        </div>
        <div className="space-y-1.5 flex-1">
          <h3 className="text-base font-semibold text-zinc-100">
            {m.magicBox} · <span className="text-amber-400">Universal Governance</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{m.magicDesc}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400 pt-1">
            <span>proposta → carimbo ExecutionProof</span>
            <span aria-hidden="true">·</span>
            <span>hash == desenho</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">fail-closed · qualquer repo</span>
          </div>
        </div>
      </section>

      {repoState && (
        <>
          {/* Castelo de Governança • Towers + Status do Castelo */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Castelo de Governança · {repoState.repo.full_name}</span>
              </h2>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">
                MAIN + {repoState.prs.length} PRs · {Object.keys(repoState.languages).length} langs
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left 8 cols: Main Tower + PR Towers + Languages */}
              <div className="lg:col-span-8 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Main Tower */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 text-center">
                      <div className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
                        {m.mainTower}
                      </div>
                      <div className="text-xs font-mono font-semibold text-zinc-100 truncate">
                        {repoState.repo.default_branch}
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                        <Hash className="w-3 h-3" />
                        <span>{repoState.commit?.sha?.slice(0, 7) || 'HEAD'}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-400 truncate text-center">
                      {repoState.runs[0]
                        ? `${repoState.runs[0].conclusion || repoState.runs[0].status} · ${repoState.runs[0].name}`
                        : repoState.commit?.commit?.message?.split('\n')[0] || 'Protected branch'}
                    </div>
                  </div>

                  {/* Open PR Towers */}
                  {repoState.prs.slice(0, 3).map((pr: any) => (
                    <div
                      key={pr.number}
                      className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2 text-center"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-amber-400">PR #{pr.number}</div>
                        <div className="text-xs font-semibold text-zinc-100 line-clamp-2">{pr.title}</div>
                        <div className="text-[11px] font-mono text-zinc-400 truncate">@{pr.user?.login}</div>
                      </div>
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono">
                        <span className={pr.draft ? 'text-amber-400' : 'text-emerald-400'}>
                          {pr.draft ? 'draft' : 'open'}
                        </span>
                        <a
                          href={pr.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>ver PR</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}

                  {Array.from({ length: Math.max(0, 3 - repoState.prs.length) }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center text-center min-h-[120px]"
                    >
                      <span className="text-xs font-mono text-zinc-500">Torre de PR Livre</span>
                    </div>
                  ))}
                </div>

                {/* Languages Bar */}
                {Object.keys(repoState.languages).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                      <span>{m.languages}</span>
                      <span>
                        {Object.keys(repoState.languages).length} langs · {repoState.repo.language || 'Primary'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs font-mono text-zinc-300">
                      {Object.entries(repoState.languages)
                        .slice(0, 6)
                        .map(([langName, bytes]) => (
                          <span key={langName}>
                            {langName} ({Math.max(1, Math.round(Number(bytes) / 1024))} KB)
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 4 cols: Status do Castelo (6 Alavancas + Auto-Fix Universal) */}
              <div className="lg:col-span-4 p-5 rounded-2xl border border-emerald-500/30 bg-zinc-900/80 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-100">Status do Castelo</h3>
                    <span className="text-xs font-mono text-emerald-400 tabular-nums">
                      {activeLeversCount}/6 alavancas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {levers.map((isOn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSingleLever(idx)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          isOn
                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-[10px] font-mono">
                          {m.lever} {idx + 1}
                        </div>
                        <div className="text-xs font-semibold mt-1">{isOn ? 'ON' : 'OFF'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleUniversalAutoFix}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <WandSparkles className="w-4 h-4" />
                    <span>{m.autoFix}</span>
                  </button>

                  {allLeversGreen && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-center space-y-0.5">
                      <div className="text-xs font-semibold text-emerald-300">
                        Castelo Seguro! 8/8 Portões Verdes · Fail-Closed Ativo
                      </div>
                      <div className="text-[11px] font-mono text-zinc-300">
                        ExecutionProof + RFC 8785 Hash Verificados
                      </div>
                    </div>
                  )}

                  {autoFixBanner && (
                    <div className="text-xs font-mono text-amber-300 text-center">
                      6 alavancas aplicadas · Broker universal ativo!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 6 Live Missions Detected in Repo */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>{m.missions}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveMissions.map((mission) => {
                const isFixed = levers[mission.leverIdx];
                const isSelected = selectedMissionId === mission.id;
                return (
                  <div
                    key={mission.id}
                    onClick={() => setSelectedMissionId(isSelected ? null : mission.id)}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-4 ${
                      isFixed
                        ? 'bg-emerald-950/20 border-emerald-600/50'
                        : isSelected
                        ? 'bg-zinc-900 border-amber-500/60'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-mono text-zinc-400">
                            {mission.gate} · {mission.cveLike}
                          </div>
                          <h3 className="text-base font-semibold text-zinc-100 mt-0.5">
                            {mission.title[lang]}
                          </h3>
                        </div>
                        <span
                          className={`text-xs font-mono font-semibold ${
                            isFixed ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isFixed ? 'OK' : mission.severity.toUpperCase()}
                        </span>
                      </div>

                      {(viewMode === 'kids' || viewMode === 'split') && (
                        <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/30 text-xs text-zinc-200 leading-relaxed">
                          <strong className="text-amber-400 mr-1">Criança:</strong>
                          {mission.kid[lang]}
                        </div>
                      )}

                      {(viewMode === 'senior' || viewMode === 'split') && (
                        <div className="p-3 rounded-xl bg-zinc-950/90 border border-emerald-500/30 text-xs font-mono text-zinc-300 leading-relaxed">
                          <strong className="text-emerald-400 mr-1">Sênior:</strong>
                          {mission.senior[lang]}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-400">{mission.fix[lang]}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSingleLever(mission.leverIdx);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          isFixed
                            ? 'bg-zinc-800 text-emerald-300'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                        }`}
                      >
                        {isFixed ? m.fixed : m.missionFix}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bancada de Correção — 6 Alavancas = 8 Portões VUC */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Hammer className="w-5 h-5 text-emerald-400" />
              <span>{m.workbench}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {LEVER_DEFS.map((lever, idx) => {
                const isOn = levers[idx];
                const IconComp = lever.icon;
                return (
                  <div
                    key={lever.id}
                    className={`p-4 rounded-2xl border transition ${
                      isOn
                        ? 'bg-emerald-950/25 border-emerald-500/50'
                        : 'bg-zinc-900/60 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                          <IconComp className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-[11px] font-mono text-zinc-400">{lever.gates}</div>
                          <div className="text-sm font-semibold text-zinc-100">{lever.title[lang]}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSingleLever(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                          isOn
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {isOn ? 'ON · fail-closed' : 'OFF'}
                      </button>
                    </div>
                    <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">{lever.desc[lang]}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Universal VUC Broker Architecture + CLI Install & Verification */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>{m.architecture} · universal for ANY repo</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-emerald-400 font-semibold">1. vuc-agent</div>
                  <div className="text-zinc-400 mt-1">Non-root untrusted caller → /run/vuc/broker.sock</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-amber-400 font-semibold">2. vuc-broker</div>
                  <div className="text-zinc-400 mt-1">Policy deny-by-default + typed executors + Ed25519 sign</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-indigo-300 font-semibold">3. Independent Verifier</div>
                  <div className="text-zinc-400 mt-1">Validates proof.json (RFC 8785 + S0 Trust Store)</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 p-5 rounded-2xl border border-emerald-500/30 bg-zinc-900/60 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>
                    {m.verify} · {repoState.repo.full_name}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `vuc invoke github inspect_repo --payload '{"repo":"${repoState.repo.full_name}"}' --proof-out proof.json && vuc verify proof.json`,
                      'verify'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === 'verify' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'verify' ? 'Copiado!' : 'Copiar CLI'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                {`vuc invoke github inspect_repo --payload '{"repo":"${repoState.repo.full_name}"}' --proof-out proof.json\nvuc verify proof.json`}
              </pre>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
