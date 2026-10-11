import React, { useState } from 'react';
import { Castle, CheckCircle2, CircleAlert, Github, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Trophy } from 'lucide-react';

type ArenaState = any;

const Gate: React.FC<{ ok: boolean; label: string; detail: string }> = ({ ok, label, detail }) => (
  <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-amber-500/30 bg-amber-950/10'}`}>
    <div className="flex items-center gap-3">
      {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <CircleAlert className="h-5 w-5 text-amber-400" />}
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-zinc-400 mt-1">{detail}</div>
      </div>
    </div>
  </div>
);

export const UniversalArena: React.FC = () => {
  const [repository, setRepository] = useState('scoobiii/vuc');
  const [prNumber, setPrNumber] = useState('');
  const [state, setState] = useState<ArenaState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invokeCastle = async () => {
    setLoading(true);
    setError('');
    setState(null);

    try {
      const response = await fetch('/api/vortex/arena/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: repository.trim(),
          pr_number: prNumber ? Number(prNumber) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.status !== 'VERIFIED') {
        throw new Error(data?.error || 'Castelo bloqueado: estado não verificável.');
      }
      setState(data);
    } catch (err: any) {
      setError(err?.message || 'GitHub indisponível. Arena bloqueada.');
    } finally {
      setLoading(false);
    }
  };

  const observation = state?.observation;
  const proof = state?.execution_proof;
  const verification = state?.verification;
  const checks = observation?.checks;

  return (
    <section className="min-h-[70vh] space-y-6">
      <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-zinc-950 to-zinc-950 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <Castle className="h-9 w-9 text-indigo-300" />
              <div>
                <h2 className="text-3xl font-black tracking-tight">VUC Universal Arena</h2>
                <p className="text-zinc-400">O castelo só abre com estado real + prova verificável.</p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-zinc-300">
              Escolha qualquer repositório GitHub acessível. A Arena consulta o GitHub de verdade,
              registra SHA/ref/checks e só entrega o prêmio quando o ExecutionProof passa pela verificação independente.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-950/40 px-4 py-3 text-xs font-mono">
            <div className="text-indigo-300">RULE</div>
            <div>NO PROOF → NO CASTLE</div>
            <div>NO LIVE DATA → BLOCKED</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <input
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invokeCastle()}
            placeholder="owner/repo"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm outline-none focus:border-indigo-400"
          />
          <input
            value={prNumber}
            onChange={(e) => setPrNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="PR opcional"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={invokeCastle}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="mx-auto h-5 w-5 animate-spin" /> : 'Invocar Castelo'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300">
            <div className="font-bold">CASTELO BLOQUEADO</div>
            <div className="mt-1 font-mono text-xs">{error}</div>
            <div className="mt-2 text-xs text-zinc-400">Nenhum estado sintético foi exibido.</div>
          </div>
        )}
      </div>

      {state && observation && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Gate ok={true} label="GitHub conectado" detail="Fonte: GitHub API" />
            <Gate ok={Boolean(observation.sha)} label="SHA ancorado" detail={observation.sha} />
            <Gate ok={Boolean(proof?.proof_hash)} label="ExecutionProof" detail={proof.proof_hash} />
            <Gate ok={verification?.valid === true} label="Verificador independente" detail="VERIFIED" />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-zinc-300" />
              <h3 className="text-lg font-bold">{observation.repository}</h3>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[10px] font-mono text-emerald-300">LIVE</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-lg bg-zinc-900 p-3"><div className="text-zinc-500">REF</div><div className="font-mono mt-1 break-all">{observation.ref}</div></div>
              <div className="rounded-lg bg-zinc-900 p-3"><div className="text-zinc-500">SHA</div><div className="font-mono mt-1 break-all">{observation.sha}</div></div>
              <div className="rounded-lg bg-zinc-900 p-3"><div className="text-zinc-500">CHECKS</div><div className="font-mono mt-1">{checks.success} success / {checks.failure} failure / {checks.total} total</div></div>
              <div className="rounded-lg bg-zinc-900 p-3"><div className="text-zinc-500">OBSERVED</div><div className="font-mono mt-1">{observation.observed_at}</div></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-amber-300" /> O que o jogador acabou de provar</div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li>✓ O repositório existe no GitHub.</li>
                <li>✓ A ref e o commit vieram da fonte externa.</li>
                <li>✓ Os check-runs foram consultados para aquele SHA.</li>
                <li>✓ O resultado foi encapsulado em ExecutionProof.</li>
                <li>✓ O verificador independente aceitou a prova.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-300" /> Prova</div>
              <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-black p-4 text-[10px] leading-relaxed text-zinc-300">{JSON.stringify(proof, null, 2)}</pre>
            </div>
          </div>

          {observation.pull_request && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex items-center gap-2 text-lg font-bold"><LockKeyhole className="h-5 w-5 text-indigo-300" /> PR #{observation.pull_request.number}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-zinc-900 p-3">STATE<br/><b>{observation.pull_request.state}</b></div>
                <div className="rounded-lg bg-zinc-900 p-3">MERGEABLE<br/><b>{String(observation.pull_request.mergeable)}</b></div>
                <div className="rounded-lg bg-zinc-900 p-3">MERGE STATE<br/><b>{observation.pull_request.mergeable_state}</b></div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6">
            <div className="flex items-center gap-3"><Trophy className="h-6 w-6 text-amber-300" /><div><div className="font-black text-xl">CASTELO ABERTO</div><div className="text-sm text-zinc-400">Prêmio liberado porque a prova é verificável.</div></div></div>
          </div>
        </>
      )}
    </section>
  );
};
