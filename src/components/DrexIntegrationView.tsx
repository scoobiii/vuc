import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Building2,
  Wallet,
  User,
  ShieldCheck,
  AlertTriangle,
  ArrowRightLeft,
  Lock,
  Unlock,
  Coins,
  Scale,
  RefreshCw,
  FileCode2,
  CheckCircle2,
  XCircle,
  Hash,
  ExternalLink,
  BookOpen,
  Play,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import type {
  DrexAccountState,
  DrexActorRole,
  DrexExecutionResponse,
  DrexOperationType,
  DrexTransactionPayload,
} from '../types/drex.js';

interface DrexIntegrationViewProps {
  onSendToVerifier?: (proof: any) => void;
}

export const DrexIntegrationView: React.FC<DrexIntegrationViewProps> = ({ onSendToVerifier }) => {
  // State
  const [accounts, setAccounts] = useState<DrexAccountState[]>([]);
  const [history, setHistory] = useState<DrexExecutionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Form State
  const [activeActorRole, setActiveActorRole] = useState<DrexActorRole>('COMMERCIAL_BANK');
  const [operation, setOperation] = useState<DrexOperationType>('SETTLE_DVP');
  const [senderId, setSenderId] = useState<string>('bank-itau-01');
  const [receiverId, setReceiverId] = useState<string>('bank-bb-01');
  const [amountBRL, setAmountBRL] = useState<string>('250000.00'); // em Reais
  const [volumeTpft, setVolumeTpft] = useState<string>('25'); // unidades
  const [legalBasis, setLegalBasis] = useState<string>('Resolução BCB nº 315/2023 - Piloto DREX DvP Atacado');
  const [judicialOrder, setJudicialOrder] = useState<string>('SisbaJud-Proc-2026.09-8812');
  const [privacyPreserving, setPrivacyPreserving] = useState<boolean>(true);

  // Result & Modal/Inspector
  const [lastResult, setLastResult] = useState<DrexExecutionResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Preset Selector
  const [activePreset, setActivePreset] = useState<string>('dvp-atacado');

  const fetchAccountsAndHistory = async () => {
    setLoading(true);
    try {
      const [accRes, histRes] = await Promise.all([
        fetch('/api/vortex/drex/accounts'),
        fetch('/api/vortex/drex/history'),
      ]);
      const accData = await accRes.json();
      const histData = await histRes.json();
      setAccounts(accData.accounts || []);
      setHistory(histData.history || []);
    } catch (err) {
      console.error('Failed to load DREX data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndHistory();
  }, []);

  const handleResetLedger = async () => {
    if (!confirm('Deseja reiniciar o estado do Ledger DREX para os saldos iniciais de teste?')) return;
    try {
      const res = await fetch('/api/vortex/drex/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts);
        setHistory([]);
        setLastResult(null);
        setErrorMessage(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    setErrorMessage(null);

    switch (presetKey) {
      case 'dvp-atacado':
        setActiveActorRole('COMMERCIAL_BANK');
        setOperation('SETTLE_DVP');
        setSenderId('bank-itau-01');
        setReceiverId('bank-bb-01');
        setAmountBRL('250000.00');
        setVolumeTpft('25');
        setLegalBasis('Resolução BCB nº 315/2023 - Piloto DREX DvP Atacado');
        setPrivacyPreserving(true);
        break;
      case 'sigilo-varejo':
        setActiveActorRole('FINTECH');
        setOperation('TRANSFER_RETAIL');
        setSenderId('fintech-nubank-01');
        setReceiverId('user-bob-pf');
        setAmountBRL('1250.00');
        setVolumeTpft('0');
        setLegalBasis('Lei Complementar nº 105/2001 (Sigilo Bancário) & Resolução BCB 1/2020');
        setPrivacyPreserving(true);
        break;
      case 'bloqueio-sisbajud':
        setActiveActorRole('CENTRAL_BANK');
        setOperation('JUDICIAL_FREEZE');
        setSenderId('bacen-node-01');
        setReceiverId('user-target-freeze');
        setAmountBRL('50000.00');
        setVolumeTpft('0');
        setLegalBasis('Art. 854 CPC / Convênio SisbaJud - Mandado nº 2026/DF-4401');
        setJudicialOrder('SisbaJud-Mandado-2026-DF-4401');
        setPrivacyPreserving(false);
        break;
      case 'emissao-bacen':
        setActiveActorRole('CENTRAL_BANK');
        setOperation('MINT_RESERVE');
        setSenderId('bacen-node-01');
        setReceiverId('bank-itau-01');
        setAmountBRL('10000000.00');
        setVolumeTpft('0');
        setLegalBasis('Art. 10 Lei 4.595/64 - Conversão de Reserva Bancária em Real Digital');
        setPrivacyPreserving(false);
        break;
      case 'auditoria-reserva':
        setActiveActorRole('CENTRAL_BANK');
        setOperation('STRIKE_PROOF_AUDIT');
        setSenderId('bacen-node-01');
        setReceiverId('bacen-node-01');
        setAmountBRL('0.00');
        setVolumeTpft('0');
        setLegalBasis('Auditoria Contínua Bacen - Prova Cética de Conservação Zero-Leak');
        setPrivacyPreserving(true);
        break;
      default:
        break;
    }
  };

  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    setErrorMessage(null);

    const amountCents = Math.round(parseFloat(amountBRL || '0') * 100);
    const volume = parseInt(volumeTpft || '0', 10);

    const payload: DrexTransactionPayload = {
      operation,
      actorRole: activeActorRole,
      senderId,
      receiverId,
      amountRealDigital: amountCents,
      volumeTpft: volume,
      legalBasis,
      judicialOrderNumber: operation === 'JUDICIAL_FREEZE' ? judicialOrder : undefined,
      privacyPreserving,
    };

    try {
      const res = await fetch('/api/vortex/drex/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro na execução da transação DREX');
      }
      setLastResult(data);
      await fetchAccountsAndHistory();
    } catch (err: any) {
      setErrorMessage(err.message || String(err));
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (selectedRoleFilter === 'ALL') return true;
    return acc.role === selectedRoleFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Landmark className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Landmark className="w-3 h-3" /> Piloto DREX Banco Central
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Fases 1 & 2 Resolvidas
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <FileCode2 className="w-3 h-3" /> DREX_Laws.bend
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
              Integração DREX Governança VUA
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              Resolução matemática e institucional das dores das <strong>Fases 1 e 2 do DREX</strong>:
              eliminação de <strong>Risco Herstatt (DvP Atômico)</strong>, proteção estrita de{' '}
              <strong>Sigilo Bancário (LC 105/2001)</strong> sem vazamento na EVM, e{' '}
              <strong>Bloqueio Cautelar SisbaJud</strong> sem condições de corrida.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetLedger}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5"
              title="Reiniciar Ledger para saldos iniciais"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Resetar Ledger
            </button>
            <a
              href="#laws-spec"
              onClick={(e) => {
                e.preventDefault();
                alert('O arquivo formal DREX_Laws.bend está salvo na raiz do projeto e disponível na aba Bend Development!');
              }}
              className="px-3 py-2 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 text-xs font-medium rounded-lg border border-purple-800/60 transition flex items-center gap-1.5"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Ver DREX_Laws.bend
            </a>
          </div>
        </div>

        {/* Matrix of Addressed Phase 1 & Phase 2 Pains */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-800/80">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              1. Dor DvP: Risco Herstatt
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              <strong>Resolvido:</strong> Liquidação atômica em Bend (<code className="text-purple-300 font-mono">execute_drex_dvp</code>). Ou Real Digital e TPFT transferem em sincronia formal absoluta, ou nenhum saldo é debitado.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-1">
              <Lock className="w-3.5 h-3.5" />
              2. Dor EVM: Sigilo Bancário (LC 105)
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              <strong>Resolvido:</strong> Provas de conservação de soma global (<code className="text-purple-300 font-mono">verify_conservation</code>) que certificam solvência sem revelar identidade ou saldo individual a outros nós.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mb-1">
              <Scale className="w-3.5 h-3.5" />
              3. Dor de Ordem Judicial (SisbaJud)
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              <strong>Resolvido:</strong> O congelamento cautelar isola o saldo em reserva judicial imutável (<code className="text-purple-300 font-mono">frozen_reserve</code>), bloqueando tentativas de saque concomitantes.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Standardized Actor Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            role: 'CENTRAL_BANK',
            title: 'Autoridade Central (Bacen)',
            icon: Landmark,
            color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
            badge: 'Poder Normativo & Emissão',
            desc: 'Emissão e queima de reservas primárias, fixação de regras de liquidação, auditoria contínua de solvência.',
            capabilities: ['MINT_RESERVE', 'BURN_RESERVE', 'SISBAJUD_ORQUESTRATION'],
          },
          {
            role: 'COMMERCIAL_BANK',
            title: 'Bancos Comerciais',
            icon: Building2,
            color: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
            badge: 'Custódia & Atacado DvP',
            desc: 'Operação de nós validadores, custódia de títulos federais TPFT, conversão atacado Real Digital vs Depósitos.',
            capabilities: ['SETTLE_DVP_WHOLESALE', 'RESERVE_MANAGEMENT', 'CUSTODY_TPFT'],
          },
          {
            role: 'FINTECH',
            title: 'Fintechs & ITPs',
            icon: Wallet,
            color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
            badge: 'Iniciação & Real Varejo',
            desc: 'Iniciação de pagamentos tokenizados, contratos inteligentes de varejo, microcrédito e integração com Pix.',
            capabilities: ['RETAIL_TRANSFER', 'SMART_CONTRACTS', 'P2P_PAYMENTS'],
          },
          {
            role: 'END_USER',
            title: 'Cidadãos & Empresas (PJ/PF)',
            icon: User,
            color: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
            badge: 'Carteira Soberana Não-Custodial',
            desc: 'Assinatura direta de transações via chave privada Ed25519, posse direta de títulos fracionados e depósitos.',
            capabilities: ['SIGN_TRANSACTION', 'BUY_FRACTIONAL_TPFT', 'ZERO_LEAK_RECEIPT'],
          },
        ].map((actor) => {
          const Icon = actor.icon;
          const isSelected = activeActorRole === actor.role;
          return (
            <div
              key={actor.role}
              onClick={() => {
                setActiveActorRole(actor.role as DrexActorRole);
                setSelectedRoleFilter(actor.role);
              }}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `${actor.color} ring-2 ring-purple-500 shadow-lg`
                  : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-black/40 border border-zinc-800">
                    {actor.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">{actor.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{actor.desc}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-1">
                {actor.capabilities.map((cap) => (
                  <span key={cap} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950/80 text-zinc-400 border border-zinc-800">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Grid: Transaction Form + Account Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transaction Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-zinc-100">
                  Terminal de Operações DREX VUA
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Ator Ativo: <strong className="text-purple-300">{activeActorRole}</strong>
              </span>
            </div>

            {/* Presets Bar */}
            <div className="mb-5">
              <label className="text-xs font-medium text-zinc-400 block mb-2">
                Cenários Pré-configurados (Fases 1 & 2):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'dvp-atacado', label: '1. DvP Atômico (Real vs TPFT)', icon: ArrowRightLeft },
                  { id: 'sigilo-varejo', label: '2. Varejo P2P (Sigilo LC 105)', icon: Lock },
                  { id: 'bloqueio-sisbajud', label: '3. Bloqueio SisbaJud', icon: Scale },
                  { id: 'emissao-bacen', label: '4. Emissão Primária Bacen', icon: Landmark },
                  { id: 'auditoria-reserva', label: '5. Auditoria de Reservas', icon: ShieldCheck },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                        activePreset === p.id
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Tipo de Operação DREX
                  </label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as DrexOperationType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="SETTLE_DVP">SETTLE_DVP (DvP Atômico: Real Digital vs TPFT)</option>
                    <option value="TRANSFER_RETAIL">TRANSFER_RETAIL (Transferência Real Varejo LC 105)</option>
                    <option value="JUDICIAL_FREEZE">JUDICIAL_FREEZE (Bloqueio Cautelar SisbaJud)</option>
                    <option value="JUDICIAL_UNFREEZE">JUDICIAL_UNFREEZE (Desbloqueio Judicial)</option>
                    <option value="MINT_RESERVE">MINT_RESERVE (Emissão de Reserva Bacen)</option>
                    <option value="STRIKE_PROOF_AUDIT">STRIKE_PROOF_AUDIT (Auditoria de Reserva Cética)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Ator Solicitante
                  </label>
                  <select
                    value={activeActorRole}
                    onChange={(e) => setActiveActorRole(e.target.value as DrexActorRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="CENTRAL_BANK">CENTRAL_BANK (Banco Central)</option>
                    <option value="COMMERCIAL_BANK">COMMERCIAL_BANK (Banco Comercial)</option>
                    <option value="FINTECH">FINTECH (Fintech / ITP)</option>
                    <option value="END_USER">END_USER (Cidadão / Empresa)</option>
                  </select>
                </div>
              </div>

              {/* Sender & Receiver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Origem / Remetente
                  </label>
                  <select
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.role}] {acc.ownerName} ({formatBRL(acc.realDigitalBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Destino / Contraparte / Alvo
                  </label>
                  <select
                    value={receiverId}
                    onChange={(e) => setReceiverId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        [{acc.role}] {acc.ownerName} ({formatBRL(acc.realDigitalBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Valor Real Digital (BRL)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountBRL}
                    onChange={(e) => setAmountBRL(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-purple-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Volume TPFT (Unidades Tesouro Selic)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={volumeTpft}
                    onChange={(e) => setVolumeTpft(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Legal Basis & SisbaJud inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-1">
                    Base Legal Normativa
                  </label>
                  <input
                    type="text"
                    value={legalBasis}
                    onChange={(e) => setLegalBasis(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
                    placeholder="ex: LC 105/2001, Resolução BCB"
                  />
                </div>

                {operation === 'JUDICIAL_FREEZE' ? (
                  <div>
                    <label className="text-xs font-medium text-rose-400 block mb-1 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Número do Mandado SisbaJud
                    </label>
                    <input
                      type="text"
                      value={judicialOrder}
                      onChange={(e) => setJudicialOrder(e.target.value)}
                      className="w-full bg-zinc-950 border border-rose-800/80 rounded-lg px-3 py-2 text-xs text-rose-200 focus:border-rose-500 focus:outline-none"
                      placeholder="Protocolo Judicial"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="privacy-check"
                      checked={privacyPreserving}
                      onChange={(e) => setPrivacyPreserving(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="privacy-check" className="text-xs text-zinc-300 select-none cursor-pointer">
                      Proteger Sigilo Bancário (LC 105) via Prova Zero-Knowledge
                    </label>
                  </div>
                )}
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="block font-semibold">Bloqueio de Conformidade VUA:</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={executing}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executando Prova Invariante em Bend...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Liquidar Operação DREX com Prova VUA
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Last Result Inspector Card */}
          {lastResult && (
            <div className="bg-zinc-900/90 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Recibo Criptográfico Homologado (Ed25519 + RFC 8785)
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                  INVARIANTE PRESERVADA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">ID da Transação:</span>
                  <span className="font-mono text-zinc-200 text-[11px]">{lastResult.transactionId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Timestamp de Liquidação:</span>
                  <span className="font-mono text-zinc-200 text-[11px]">{lastResult.settlementTimestamp}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-zinc-500 block">Hash da Prova Canônica (SHA-256):</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-purple-300 text-[11px] bg-zinc-950 px-2 py-1 rounded border border-zinc-800 flex-1 truncate">
                      {lastResult.proofHash}
                    </code>
                    <button
                      onClick={() => copyToClipboard(lastResult.proofHash, 'proofHash')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded"
                    >
                      {copiedHash === 'proofHash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verified Bend Laws */}
              <div>
                <span className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Leis Formais Verificadas (DREX_Laws.bend):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {lastResult.lawsVerified.map((law) => (
                    <span key={law} className="text-[10px] font-mono px-2 py-0.5 bg-purple-950/60 text-purple-300 border border-purple-800/60 rounded flex items-center gap-1">
                      <FileCode2 className="w-2.5 h-2.5" />
                      {law}
                    </span>
                  ))}
                </div>
              </div>

              {/* Audit Rules Breakdown */}
              <div className="space-y-1.5">
                {lastResult.auditTrail.map((at, idx) => (
                  <div key={idx} className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-lg text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-200 font-mono text-[11px]">{at.rule}:</strong>{' '}
                      <span className="text-zinc-400">{at.description}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* State Transitions diff */}
              <div className="pt-2 border-t border-zinc-800 text-[11px]">
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block font-semibold mb-1">Remetente:</span>
                    <div>Saldo Pré: {formatBRL(lastResult.stateSnapshot.senderPre.realDigitalBalance || 0)}</div>
                    <div className="text-emerald-400 font-bold">Saldo Pós: {formatBRL(lastResult.stateSnapshot.senderPost.realDigitalBalance || 0)}</div>
                    <div>TPFT: {lastResult.stateSnapshot.senderPost.tpftBalance} unid.</div>
                    {lastResult.stateSnapshot.senderPost.frozenBalance ? (
                      <div className="text-rose-400">Bloqueio: {formatBRL(lastResult.stateSnapshot.senderPost.frozenBalance)}</div>
                    ) : null}
                  </div>

                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
                    <span className="text-zinc-400 block font-semibold mb-1">Destinatário:</span>
                    <div>Saldo Pré: {formatBRL(lastResult.stateSnapshot.receiverPre.realDigitalBalance || 0)}</div>
                    <div className="text-emerald-400 font-bold">Saldo Pós: {formatBRL(lastResult.stateSnapshot.receiverPost.realDigitalBalance || 0)}</div>
                    <div>TPFT: {lastResult.stateSnapshot.receiverPost.tpftBalance} unid.</div>
                    {lastResult.stateSnapshot.receiverPost.frozenBalance ? (
                      <div className="text-rose-400">Bloqueio: {formatBRL(lastResult.stateSnapshot.receiverPost.frozenBalance)}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Ledger Explorer & Real-Time Accounts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-semibold text-zinc-100">
                  Contas do Ecossistema DREX ({filteredAccounts.length})
                </h2>
              </div>
              <button
                onClick={fetchAccountsAndHistory}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded"
                title="Atualizar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['ALL', 'CENTRAL_BANK', 'COMMERCIAL_BANK', 'FINTECH', 'END_USER'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedRoleFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition ${
                    selectedRoleFilter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Accounts List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredAccounts.map((acc) => {
                const isRestricted = acc.complianceStatus === 'RESTRICTED';
                return (
                  <div
                    key={acc.id}
                    className={`p-3.5 rounded-xl border transition ${
                      isRestricted
                        ? 'border-rose-800/80 bg-rose-950/20'
                        : 'border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                              acc.role === 'CENTRAL_BANK'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : acc.role === 'COMMERCIAL_BANK'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : acc.role === 'FINTECH'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {acc.role}
                          </span>
                          {isRestricted ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-rose-950 text-rose-400 border border-rose-800 rounded flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> SISBAJUD BLOQUEADO
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-zinc-500">
                              {acc.complianceStatus}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-200">{acc.ownerName}</h4>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {acc.cnpjOrCpfMasked} • Nó: {acc.nodeId}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-zinc-100">
                          {formatBRL(acc.realDigitalBalance)}
                        </div>
                        <div className="text-[10px] font-mono text-amber-400">
                          {acc.tpftBalance} TPFT
                        </div>
                        {acc.frozenBalance > 0 && (
                          <div className="text-[10px] font-mono text-rose-400">
                            Bloq: {formatBRL(acc.frozenBalance)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Trail History */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Histórico de Assinaturas DREX ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhuma transação executada nesta sessão.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {history.map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800/80 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-zinc-400 mb-1">
                      <span className="font-mono text-purple-300 font-semibold">{tx.operation}</span>
                      <span className="text-[10px] text-zinc-500">{new Date(tx.settlementTimestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-zinc-300 truncate font-mono text-[10px]">
                      Hash: {tx.proofHash}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
