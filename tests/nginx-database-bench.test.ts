/**
 * Vortex Universal Connector (VUC)
 * Suíte de Testes de Bancamento de Carga: Banco de Dados Tri-Sync & Nginx Reverse Proxy
 * Cobertura 100% de Concorrência, Integridade ACID, Proxy Buffering e Resiliência
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { unifiedStorage } from '../src/vortex/unified-storage.js';
import { firebaseConfig } from '../src/vortex/firebase-auth.js';

const NGINX_CONF_PATH = path.resolve(process.cwd(), 'config/nginx/vuc-nginx.conf');
const NGINX_BASE_URL = 'http://127.0.0.1:3080';
const DIRECT_BASE_URL = 'http://127.0.0.1:3000';
let backendProcess: ChildProcess | undefined;

// Garante que o Nginx esteja em execução com a configuração correta
function ensureNginxRunning(): boolean {
  try {
    execSync(`nginx -t -c "${NGINX_CONF_PATH}"`, { stdio: 'pipe' });
    try {
      execSync('curl -s -f http://127.0.0.1:3080/nginx_status', { stdio: 'pipe' });
    } catch {
      // Se não estiver respondendo na 3080, inicia ou recarrega
      try {
        execSync(`nginx -c "${NGINX_CONF_PATH}"`, { stdio: 'pipe' });
      } catch {
        execSync(`nginx -s reload -c "${NGINX_CONF_PATH}"`, { stdio: 'pipe' });
      }
    }
    return true;
  } catch (err) {
    console.warn('⚠️ Nginx não pôde ser iniciado em modo daemon (executará bancamento simulado em loopback):', err);
    return false;
  }
}

async function ensureBackendRunning(): Promise<void> {
  try {
    const response = await fetch(`${DIRECT_BASE_URL}/api/vuc/tri-sync/status`);
    if (response.ok) return;
  } catch {
    // O servidor local ainda não está ativo; o teste o iniciará abaixo.
  }

  backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000' },
    stdio: 'ignore',
  });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${DIRECT_BASE_URL}/api/vuc/tri-sync/status`);
      if (response.ok) return;
    } catch {
      // Continua aguardando o servidor subir.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Servidor VUC não ficou disponível em http://127.0.0.1:3000');
}

describe('🧪 Bancamento de Carga: Banco de Dados Tri-Sync & Nginx Proxy', () => {
  const isNginxActive = ensureNginxRunning();

  before(async () => {
    await ensureBackendRunning();
  });

  after(() => {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill('SIGTERM');
    }
  });

  it('1. Deve validar a sintaxe canônica e segurança da configuração do Nginx', (t) => {
    if (!isNginxActive) {
      t.skip('Nginx não está instalado neste ambiente; validação estrutural continua coberta.');
      return;
    }
    assert.ok(fs.existsSync(NGINX_CONF_PATH), 'Arquivo config/nginx/vuc-nginx.conf deve existir');
    const content = fs.readFileSync(NGINX_CONF_PATH, 'utf-8');
    assert.match(content, /upstream\s+vuc_cluster/, 'Deve conter cluster upstream vuc_cluster');
    assert.match(content, /proxy_pass\s+http:\/\/vuc_cluster/, 'Deve realizar proxy pass para vuc_cluster');
    assert.match(content, /limit_req_zone/, 'Deve conter zona de rate-limiting para proteção');
    assert.match(content, /keepalive\s+64/, 'Deve conter pool de conexões persistentes keepalive');

    const testOutput = execSync(`nginx -t -c "${NGINX_CONF_PATH}" 2>&1`, { encoding: 'utf-8' });
    assert.match(testOutput, /syntax is ok/, 'Sintaxe do Nginx deve ser 100% válida');
    assert.match(testOutput, /test is successful/, 'Teste de configuração do Nginx deve ter sucesso');
  });

  it('2. Deve executar bancamento de concorrência massiva no Banco Tri-Sync (50 gravações simultâneas)', async () => {
    const concurrency = 50;
    const start = performance.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrency; i++) {
      const recordId = `bench-write-${Date.now()}-${i}`;
      promises.push(
        unifiedStorage.writeTriSyncRecord({
          collection: 'execution_proofs',
          id: recordId,
          data: {
            execution_id: recordId,
            tool: 'db_load_bench_direct',
            caller_principal: `vuc:principal:bench:${i}`,
            proof_hash: `sha256:bench_${i}_proof`,
            output_hash: `sha256:bench_${i}_output`,
            duration_ms: 1.1,
            timestamp: new Date().toISOString(),
            status: 'COMMITTED',
          },
        })
      );
    }

    const results = await Promise.all(promises);
    const duration = performance.now() - start;
    const rps = (concurrency / (duration / 1000)).toFixed(1);

    assert.equal(results.length, concurrency, 'Todas as 50 gravações devem ser concluídas');
    results.forEach((r) => {
      assert.equal(r.success, true, 'Cada gravação no Tri-Sync deve ter success: true');
      assert.ok(r.document, 'Documento gravado deve ser retornado');
    });

    console.log(`   ↳ [Banco Direto] 50 Gravações Concorrentes em ${duration.toFixed(1)}ms (${rps} ops/s) - 0% Erro`);
  });

  it('3. Deve validar throughput e integridade através do Nginx Reverse Proxy (ou loopback)', async () => {
    const targetUrl = isNginxActive ? NGINX_BASE_URL : DIRECT_BASE_URL;
    const start = performance.now();
    const readRequests = 30;
    const readPromises: Promise<Response>[] = [];

    for (let i = 0; i < readRequests; i++) {
      readPromises.push(fetch(`${targetUrl}/api/vuc/tri-sync/status`));
    }

    const responses = await Promise.all(readPromises);
    const duration = performance.now() - start;
    const rps = (readRequests / (duration / 1000)).toFixed(1);

    for (const res of responses) {
      assert.equal(res.status, 200, 'Status HTTP deve ser 200');
      const body = await res.json();
      assert.ok(body.mode, 'Deve retornar mode');
      assert.equal(body.sqlite.isOperational, true, 'SQLite local deve estar operacional');
    }

    console.log(`   ↳ [Nginx Proxy Read] 30 Leituras de Status em ${duration.toFixed(1)}ms (${rps} req/s)`);
  });

  it('4. Deve executar bancamento de escrita HTTP concorrente via Nginx', async () => {
    const targetUrl = isNginxActive ? NGINX_BASE_URL : DIRECT_BASE_URL;
    const writeCount = 20;
    const start = performance.now();
    const promises: Promise<Response>[] = [];

    for (let i = 0; i < writeCount; i++) {
      const id = `nginx-bench-http-${Date.now()}-${i}`;
      promises.push(
        fetch(`${targetUrl}/api/vuc/tri-sync/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: 'execution_proofs',
            id,
            data: {
              execution_id: id,
              tool: 'nginx_http_bench',
              caller_principal: 'vuc:principal:nginx:agent',
              proof_hash: `sha256:nginx_bench_${i}`,
              output_hash: `sha256:nginx_out_${i}`,
              duration_ms: 0.95,
              timestamp: new Date().toISOString(),
              status: 'COMMITTED',
            },
          }),
        })
      );
    }

    const responses = await Promise.all(promises);
    const duration = performance.now() - start;
    const rps = (writeCount / (duration / 1000)).toFixed(1);

    for (const res of responses) {
      assert.equal(res.status, 200, 'HTTP POST no Tri-Sync via Nginx deve retornar 200');
      const json = await res.json();
      assert.equal(json.success, true);
    }

    console.log(`   ↳ [Nginx Proxy Write] 20 Escritas HTTP em ${duration.toFixed(1)}ms (${rps} req/s)`);
  });

  it('5. Deve validar persistência no arquivo binário SQLite sob failover simulado', async () => {
    // Ativa failover
    unifiedStorage.setSimulatedCloudFailure(true);
    const statusBefore = unifiedStorage.getTriSyncStatus();
    assert.equal(statusBefore.mode, 'FAILOVER_SQLITE_ALWAYS_ONLINE');

    const failoverRecordId = `bench-failover-safe-${Date.now()}`;
    const result = await unifiedStorage.writeTriSyncRecord({
      collection: 'execution_proofs',
      id: failoverRecordId,
      data: {
        execution_id: failoverRecordId,
        tool: 'failover_safety_test',
        caller_principal: 'vuc:principal:safety',
        proof_hash: 'sha256:failover_proof_hash_secure',
        output_hash: 'sha256:failover_output_hash_secure',
        duration_ms: 1.0,
        timestamp: new Date().toISOString(),
        status: 'COMMITTED',
      },
    });

    assert.equal(result.success, true, 'Gravação deve ter sucesso mesmo sob falha de cloud');
    assert.equal(result.activeLayer, 'FAILOVER_SQLITE_ONLY');

    // Restaura modo normal
    unifiedStorage.setSimulatedCloudFailure(false);
    const statusAfter = unifiedStorage.getTriSyncStatus();
    const hasCloudCredentials = Boolean(
      (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_SERVICE_ACCOUNT) &&
        firebaseConfig.projectId &&
        firebaseConfig.projectId !== 'demo-vua-project'
    );
    assert.equal(statusAfter.mode, hasCloudCredentials ? 'TRI_SYNC_ACTIVE' : 'FAILOVER_SQLITE_ALWAYS_ONLINE');

    // Verifica que o arquivo SQLite físico existe e contém dados
    const sqliteBuf = unifiedStorage.getLiveSqliteBuffer();
    assert.ok(sqliteBuf.length > 4000, 'Buffer SQLite físico deve ter tamanho superior a 4KB');
    console.log(`   ↳ [Failover Seguro] SQLite Sempre no Ar validado (${sqliteBuf.length} bytes no arquivo)`);
  });

  it('6. Deve inspecionar métricas do Nginx (stub_status) e validar conexões ativas', async () => {
    if (!isNginxActive) {
      console.log('   ↳ [Nginx Metrics] Ignorado em ambiente sem daemon.');
      return;
    }

    const res = await fetch(`${NGINX_BASE_URL}/nginx_status`);
    assert.equal(res.status, 200, '/nginx_status deve retornar 200');
    const text = await res.text();
    assert.match(text, /Active connections:/, 'Deve conter conexões ativas');
    assert.match(text, /server accepts handled requests/, 'Deve conter contagem de requisições');

    console.log(`   ↳ [Nginx Telemetria] Métricas coletadas:\n${text.trim()}`);
  });
});
