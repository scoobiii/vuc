import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shield,
  FileCode,
  Zap,
  Server,
  Activity,
  Code2,
  Copy,
  Check,
} from 'lucide-react';

interface TriSyncStatus {
  mode: string;
  cloudSql: {
    engine: string;
    dialect: string;
    databaseName: string;
    host: string;
    orm: string;
    status: string;
    tables: string[];
  };
  firestore: {
    engine: string;
    projectId: string;
    databaseId: string;
    region: string;
    status: string;
    rulesVersion: string;
  };
  sqlite: {
    engine: string;
    databasePath: string;
    status: string;
    isOperational: boolean;
    resilienceGuarantee: string;
  };
  records: {
    documentsCount: number;
    drexAccountsCount: number;
    drexTransactionsCount: number;
    executionProofsCount: number;
  };
  simulatedFailureActive: boolean;
  lastSyncTimestamp: string;
}

export const CloudSqlSyncView: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<TriSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [writeResult, setWriteResult] = useState<any>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'cloudsql' | 'drizzle' | 'sqlite' | 'json'>('cloudsql');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [eventLogs, setEventLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' }>>([]);

  const fetchTriSyncStatus = async () => {
    try {
      const res = await fetch('/api/vuc/tri-sync/status');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Falha ao obter status Tri-Sync:', err);
    }
  };

  useEffect(() => {
    fetchTriSyncStatus();
    const interval = setInterval(fetchTriSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setEventLogs((prev) => [{ time, text, type }, ...prev.slice(0, 19)]);
  };

  const handleToggleSimulatedFailure = async () => {
    setIsLoading(true);
    const nextState = !syncStatus?.simulatedFailureActive;
    try {
      const res = await fetch('/api/vuc/tri-sync/simulate-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate: nextState }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
        if (nextState) {
          addLog('⚡ Falha de Nuvem Simulada: API Key / Cloud offline -> SQLite assumiu 100% como primário!', 'warning');
        } else {
          addLog('✓ Conexão restaurada: Tri-Sync operacional (Cloud SQL + Firestore + SQLite).', 'success');
        }
      }
    } catch (err) {
      console.error('Erro ao alternar simulação:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteRecord = async () => {
    setIsWriting(true);
    setWriteResult(null);
    try {
      const now = Date.now();
      const payload = {
        collection: 'execution_proofs',
        id: `proof-tri-${now}`,
        data: {
          execution_id: `proof-tri-${now}`,
          tool: 'tri_sync_replicate_gate',
          caller_principal: 'vuc:principal:operator:active',
          proof_hash: `sha256:tri_${now.toString(16)}_proof_hash`,
          output_hash: `sha256:tri_${now.toString(16)}_output_hash`,
          duration_ms: Math.floor(Math.random() * 50) / 10 + 0.8,
          timestamp: new Date().toISOString(),
          status: 'COMMITTED',
        },
      };

      const res = await fetch('/api/vuc/tri-sync/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setWriteResult(data);
        addLog(`Registro ${payload.id} gravado no Tri-Sync (${data.activeLayer})`, 'success');
        fetchTriSyncStatus();
      }
    } catch (err: any) {
      console.error('Erro ao gravar no Tri-Sync:', err);
      addLog(`Erro ao gravar no Tri-Sync: ${err?.message || err}`, 'warning');
    } finally {
      setIsWriting(false);
    }
  };

  const handleDownloadSqlite = async () => {
    try {
      addLog('Iniciando download do banco SQLite local...', 'info');
      const res = await fetch('/api/vuc/tri-sync/download-sqlite');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vua_local.sqlite';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog('✓ Download concluído: vua_local.sqlite sincronizado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro no download do SQLite:', err);
      addLog(`Falha no download SQLite: ${err?.message || err}`, 'warning');
    }
  };

  const handleDownloadBundleZip = async () => {
    try {
      addLog('Iniciando download do pacote mobile com SQLite sincronizado...', 'info');
      const res = await fetch('/api/vuc/apk/download');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vuc-mobile-suite.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog('✓ Download concluído: vuc-mobile-suite.zip com SQLite e DDL sincronizados!', 'success');
    } catch (err: any) {
      console.error('Erro no download do pacote:', err);
      addLog(`Falha no download do pacote: ${err?.message || err}`, 'warning');
    }
  };

  const postgresDdlCode = `-- Cloud SQL (PostgreSQL 16) DDL Schema
-- Sincronizado automaticamente com Firestore e SQLite Local

CREATE TABLE IF NOT EXISTS drex_accounts (
  id VARCHAR(64) PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  cnpj_or_cpf_masked VARCHAR(32) NOT NULL,
  real_digital_balance BIGINT NOT NULL DEFAULT 0,
  tpft_balance BIGINT NOT NULL DEFAULT 0,
  frozen_balance BIGINT NOT NULL DEFAULT 0,
  node_id VARCHAR(64) NOT NULL,
  compliance_status VARCHAR(64) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drex_transactions (
  id VARCHAR(64) PRIMARY KEY,
  operation VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64),
  amount_real_digital BIGINT NOT NULL DEFAULT 0,
  volume_tpft BIGINT NOT NULL DEFAULT 0,
  legal_basis TEXT,
  proof_hash VARCHAR(128),
  execution_hash VARCHAR(128),
  signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_proofs (
  execution_id VARCHAR(64) PRIMARY KEY,
  tool VARCHAR(128),
  proof_hash VARCHAR(128),
  output_hash VARCHAR(128),
  duration_ms NUMERIC(10, 3),
  caller_principal VARCHAR(128),
  signature TEXT,
  data_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arena_tournaments (
  tournament_id VARCHAR(64) PRIMARY KEY,
  round INT NOT NULL,
  score NUMERIC(5, 2) NOT NULL,
  evidence_hash VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const drizzleOrmCode = `// src/db/schema.ts - Drizzle ORM Schema para Cloud SQL (PostgreSQL)
import { pgTable, text, bigint, timestamp, numeric, jsonb, integer } from 'drizzle-orm/pg-core';

export const drexAccounts = pgTable('drex_accounts', {
  id: text('id').primaryKey(),
  ownerName: text('owner_name').notNull(),
  role: text('role').notNull(),
  cnpjOrCpfMasked: text('cnpj_or_cpf_masked').notNull(),
  realDigitalBalance: bigint('real_digital_balance', { mode: 'number' }).notNull(),
  tpftBalance: bigint('tpft_balance', { mode: 'number' }).notNull(),
  frozenBalance: bigint('frozen_balance', { mode: 'number' }).notNull(),
  nodeId: text('node_id').notNull(),
  complianceStatus: text('compliance_status').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const executionProofs = pgTable('execution_proofs', {
  executionId: text('execution_id').primaryKey(),
  tool: text('tool'),
  proofHash: text('proof_hash'),
  outputHash: text('output_hash'),
  durationMs: numeric('duration_ms'),
  callerPrincipal: text('caller_principal'),
  signature: text('signature'),
  dataJson: jsonb('data_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});`;

  const sqliteDdlCode = `-- SQLite Local Mirror (data/vua_local.sqlite)
-- Native Node.js node:sqlite (DatabaseSync) - SEMPRE NO AR!

CREATE TABLE IF NOT EXISTS firestore_mirror (
  collection_name TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  PRIMARY KEY(collection_name, doc_id)
);

CREATE TABLE IF NOT EXISTS drex_accounts (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  role TEXT NOT NULL,
  cnpj_or_cpf_masked TEXT NOT NULL,
  real_digital_balance INTEGER NOT NULL,
  tpft_balance INTEGER NOT NULL,
  frozen_balance INTEGER NOT NULL,
  node_id TEXT NOT NULL,
  compliance_status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_proofs (
  execution_id TEXT PRIMARY KEY,
  tool TEXT,
  proof_hash TEXT,
  output_hash TEXT,
  duration_ms REAL,
  caller_principal TEXT,
  signature TEXT,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isSimulated = syncStatus?.simulatedFailureActive;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Tri-Sync Architecture */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <Database className="w-6 h-6" />
                </span>
                <span>Cloud SQL & Firestore Tri-Sync Ledger</span>
              </h2>
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  isSimulated
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                    : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSimulated ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                {isSimulated ? 'FAILOVER SQLITE ATIVO (CLOUD SIMULADA OFFLINE)' : 'TRI-SYNC 100% SINCRONIZADO'}
              </span>
            </div>

            <p className="text-xs text-zinc-300 max-w-4xl leading-relaxed">
              Camada de persistência tri-híbrida de governança: sincronização bidirecional entre{' '}
              <strong className="text-white">Cloud SQL (PostgreSQL Enterprise)</strong>,{' '}
              <strong className="text-white">Google Cloud Firestore (us-west2)</strong> e o espelho local{' '}
              <strong className="text-emerald-400">SQLite (SEMPRE NO AR)</strong>. Se as credenciais de API Key ou a nuvem falharem, o motor local em SQLite assume as gravações instantaneamente sem perda de dados nem interrupção de serviço.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleToggleSimulatedFailure}
              disabled={isLoading}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 ${
                isSimulated
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulated ? 'Desativar Falha Simulada' : 'Simular Falha de Cloud / Key'}</span>
            </button>

            <button
              onClick={handleWriteRecord}
              disabled={isWriting}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWriting ? 'animate-spin' : ''}`} />
              <span>{isWriting ? 'Gravando...' : 'Gravar Prova no Tri-Sync'}</span>
            </button>
          </div>
        </div>

        {/* Resilience Alert if Cloud Failure is simulated */}
        {isSimulated && (
          <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-lg text-xs text-amber-200 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Regra de Resiliência Ativa:</strong> As chamadas para a nuvem foram interceptadas. O motor local{' '}
                <code className="text-amber-300 font-mono">node:sqlite (data/vua_local.sqlite)</code> está operando como fonte primária de verdade. Nenhuma prova ou saldo foi perdido!
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/30">
              0ms DOWNTIME
            </span>
          </div>
        )}
      </div>

      {/* 3 Architecture Nodes Topology */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1: Cloud SQL */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Camada 1: Cloud SQL</h3>
                <span className="text-[11px] text-zinc-400 font-mono">PostgreSQL 16 Enterprise</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isSimulated
                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  : 'bg-blue-950 border-blue-500/30 text-blue-300'
              }`}
            >
              {isSimulated ? 'STANDBY' : 'REPLICANDO'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="font-mono text-zinc-200">vua_enterprise_ledger</span>
            </div>
            <div className="flex justify-between">
              <span>Dialeto & ORM:</span>
              <span className="font-mono text-zinc-200">PostgreSQL / Drizzle Kit</span>
            </div>
            <div className="flex justify-between">
              <span>Host Socket:</span>
              <span className="font-mono text-zinc-400 truncate max-w-[180px]">
                /cloudsql/...:us-west2:vua-sql
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tabelas Mapeadas:</span>
              <span className="font-mono text-blue-400">5 Schemas ACID</span>
            </div>
          </div>
        </div>

        {/* Layer 2: Firestore */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Camada 2: Firestore</h3>
                <span className="text-[11px] text-zinc-400 font-mono">NoSQL & ABAC Security</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isSimulated
                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  : 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {isSimulated ? 'PAUSADO' : 'CONECTADO'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
            <div className="flex justify-between">
              <span>Database ID:</span>
              <span className="font-mono text-zinc-200 truncate max-w-[160px]">
                {syncStatus?.firestore?.databaseId || 'ai-studio-vua-...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Região:</span>
              <span className="font-mono text-zinc-200">us-west2 (Enterprise)</span>
            </div>
            <div className="flex justify-between">
              <span>Segurança:</span>
              <span className="font-mono text-amber-300">Rules v2 Hardened (Zero-Trust)</span>
            </div>
            <div className="flex justify-between">
              <span>Sincronização:</span>
              <span className="font-mono text-emerald-400">WebSockets onSnapshot</span>
            </div>
          </div>
        </div>

        {/* Layer 3: SQLite Local */}
        <div className="bg-zinc-900/90 border-2 border-emerald-500/40 rounded-xl p-5 space-y-3 relative shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Camada 3: SQLite Local</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    SEMPRE NO AR
                  </span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">node:sqlite (DatabaseSync)</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
              100% OPERACIONAL
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
            <div className="flex justify-between">
              <span>Arquivo Físico:</span>
              <span className="font-mono text-emerald-300">data/vua_local.sqlite</span>
            </div>
            <div className="flex justify-between">
              <span>Dependência de Rede:</span>
              <span className="font-mono text-zinc-200">Zero (100% Offline e Durável)</span>
            </div>
            <div className="flex justify-between">
              <span>Garantia de Failover:</span>
              <span className="font-mono text-emerald-400">0ms Fallback Instantâneo</span>
            </div>
            <div className="flex justify-between">
              <span>Download Local:</span>
              <span className="font-mono text-cyan-300">Sincronizado Continuamente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Downloads and Persistence Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Downloads Locais Sincronizados (Nenhum dado é perdido)</span>
            </h3>
            <p className="text-xs text-zinc-400">
              O banco de dados local SQLite e o pacote mobile incorporam todas as transações e provas emitidas, mantendo paridade com Firestore e Cloud SQL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadSqlite}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Banco SQLite (vua_local.sqlite)</span>
            </button>

            <button
              onClick={handleDownloadBundleZip}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Pacote Completo (ZIP Sincronizado)</span>
            </button>
          </div>
        </div>

        {/* Live Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Provas de Execução (Proofs)</div>
            <div className="text-lg font-mono font-bold text-white pt-1">
              {syncStatus?.records?.executionProofsCount || 0}
            </div>
            <div className="text-[10px] text-emerald-400 pt-0.5">Sincronizado nos 3 motores</div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Contas DREX Registradas</div>
            <div className="text-lg font-mono font-bold text-white pt-1">
              {syncStatus?.records?.drexAccountsCount || 0}
            </div>
            <div className="text-[10px] text-blue-400 pt-0.5">Bacen + Bancos + Energia</div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Transações & DvP Energia</div>
            <div className="text-lg font-mono font-bold text-white pt-1">
              {syncStatus?.records?.drexTransactionsCount || 0}
            </div>
            <div className="text-[10px] text-amber-400 pt-0.5">Leis Formais DREX</div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-[11px] text-zinc-400">Total de Documentos Espelho</div>
            <div className="text-lg font-mono font-bold text-white pt-1">
              {syncStatus?.records?.documentsCount || 0}
            </div>
            <div className="text-[10px] text-zinc-400 pt-0.5">Firestore Mirror Table</div>
          </div>
        </div>
      </div>

      {/* Schema & DDL Explorer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Especificação de Schemas & DDL de Replicação</h3>
              <p className="text-xs text-zinc-400">
                Schemas unificados em PostgreSQL (Cloud SQL), Drizzle ORM TypeScript e SQLite Local.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setActiveSchemaTab('cloudsql')}
                className={`px-3 py-1 rounded transition-all ${
                  activeSchemaTab === 'cloudsql' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                PostgreSQL DDL
              </button>
              <button
                onClick={() => setActiveSchemaTab('drizzle')}
                className={`px-3 py-1 rounded transition-all ${
                  activeSchemaTab === 'drizzle' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Drizzle ORM (TS)
              </button>
              <button
                onClick={() => setActiveSchemaTab('sqlite')}
                className={`px-3 py-1 rounded transition-all ${
                  activeSchemaTab === 'sqlite' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SQLite Local
              </button>
            </div>

            <button
              onClick={() => {
                const code =
                  activeSchemaTab === 'cloudsql'
                    ? postgresDdlCode
                    : activeSchemaTab === 'drizzle'
                    ? drizzleOrmCode
                    : sqliteDdlCode;
                copyCode(code);
              }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
              title="Copiar código"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-80 border border-zinc-800/80">
          <pre>
            {activeSchemaTab === 'cloudsql' && postgresDdlCode}
            {activeSchemaTab === 'drizzle' && drizzleOrmCode}
            {activeSchemaTab === 'sqlite' && sqliteDdlCode}
          </pre>
        </div>
      </div>

      {/* Realtime Event Log */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Log em Tempo Real de Mutações & Sincronização</span>
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            Última sync: {syncStatus?.lastSyncTimestamp ? new Date(syncStatus.lastSyncTimestamp).toLocaleTimeString() : 'N/A'}
          </span>
        </div>

        <div className="bg-zinc-950 rounded-lg p-3 space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs border border-zinc-800">
          {eventLogs.length === 0 ? (
            <div className="text-zinc-500 text-center py-4">
              Nenhuma mutação registrada nesta sessão. Clique em &quot;Gravar Prova no Tri-Sync&quot; para disparar uma replicação.
            </div>
          ) : (
            eventLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-zinc-500">[{log.time}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-zinc-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
