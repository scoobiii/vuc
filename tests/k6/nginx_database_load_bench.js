import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3s', target: 20 },  // Ramp-up inicial até 20 VUs
    { duration: '5s', target: 60 },  // Pico de carga de bancamento até 60 VUs concorrentes
    { duration: '2s', target: 0 },   // Resfriamento (cool-down)
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],     // Menos de 1% de falhas
    http_req_duration: ['p(95)<120'],   // 95% das operações de banco via Nginx abaixo de 120ms
    checks: ['rate>0.99'],              // 99%+ de verificações de conformidade aprovadas
  },
};

// Se NGINX_URL for fornecido, testa o proxy reverso na porta 3080; caso contrário, usa 3080
const NGINX_URL = __ENV.NGINX_URL || __ENV.BASE_URL || 'http://127.0.0.1:3080';

export default function () {
  // 1. Bancamento de Consulta de Status do Banco Tri-Sync via Nginx
  const statusRes = http.get(`${NGINX_URL}/api/vuc/tri-sync/status`);
  check(statusRes, {
    'nginx status 200': (r) => r.status === 200,
    'tri-sync mode valid': (r) => r.json('mode') === 'TRI_SYNC_ACTIVE' || r.json('mode') === 'FAILOVER_SQLITE_ALWAYS_ONLINE',
    'sqlite operational': (r) => r.json('sqlite.isOperational') === true,
    'nginx header present': (r) => r.headers['X-Vuc-Engine'] === 'Nginx-Reverse-Proxy-TriSync' || !!r.headers['Server'],
  });

  // 2. Bancamento de Gravação de Prova no Banco Tri-Sync via Nginx
  const recordId = `k6-bench-nginx-${Date.now()}-${__VU}-${__ITER}`;
  const writePayload = JSON.stringify({
    collection: 'execution_proofs',
    id: recordId,
    data: {
      execution_id: recordId,
      tool: 'nginx_db_load_bench',
      caller_principal: `vuc:principal:k6:vu-${__VU}`,
      proof_hash: `sha256:bench_${recordId}_proof`,
      output_hash: `sha256:bench_${recordId}_output`,
      duration_ms: 1.25,
      timestamp: new Date().toISOString(),
      status: 'COMMITTED',
    },
  });

  const writeRes = http.post(`${NGINX_URL}/api/vuc/tri-sync/write`, writePayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(writeRes, {
    'nginx write status 200': (r) => r.status === 200,
    'nginx write success': (r) => r.json('success') === true,
    'nginx write layer committed': (r) => r.json('activeLayer') === 'TRI_SYNC_ALL_ACTIVE' || r.json('activeLayer') === 'FAILOVER_SQLITE_ONLY',
  });

  // 3. Bancamento de Leitura Cacheada de Provas e Contas DREX via Nginx
  const exportRes = http.get(`${NGINX_URL}/api/vuc/tri-sync/export-json`);
  check(exportRes, {
    'export status 200': (r) => r.status === 200,
    'export has accounts': (r) => Array.isArray(r.json('accounts')),
    'export has proofs': (r) => Array.isArray(r.json('proofs')),
  });

  // 4. Download Sincronizado do Binário SQLite (Streaming Throughput)
  const sqliteRes = http.get(`${NGINX_URL}/api/vuc/tri-sync/download-sqlite`);
  check(sqliteRes, {
    'sqlite binary status 200': (r) => r.status === 200,
    'sqlite binary size > 0': (r) => r.body.length > 1024,
  });

  sleep(0.05); // 50ms de pausa para simular alta concorrência contínua
}
