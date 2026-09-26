import http from 'k6/http';
import exec from 'k6/execution';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const LOCAL_URL = __ENV.LOCAL_URL || __ENV.BASE_URL || 'http://localhost:3000';
const CLOUDRUN_URL = __ENV.CLOUDRUN_URL || '';
const CLOUDRUN_COOKIE = __ENV.CLOUDRUN_COOKIE || '';
const CLOUDRUN_TOKEN = __ENV.CLOUDRUN_TOKEN || '';
const DEVICE_LABEL = __ENV.DEVICE_LABEL || 'A23/Termux';
const BASELINE_MAX_VUS = Number(__ENV.BASELINE_MAX_VUS || 1);
const LOAD_MAX_VUS = Number(__ENV.LOAD_MAX_VUS || 10);
const PEAK_VUS = Number(__ENV.PEAK_VUS || 40);

const localUsefulDuration = new Trend('local_useful_duration_ms', true);
const cloudUsefulDuration = new Trend('cloud_useful_duration_ms', true);
const localRawDuration = new Trend('local_raw_duration_ms', true);
const cloudRawDuration = new Trend('cloud_raw_duration_ms', true);
const localTTFB = new Trend('local_waiting_ttfb_ms', true);
const cloudTTFB = new Trend('cloud_waiting_ttfb_ms', true);
const localCryptoDuration = new Trend('local_crypto_proof_ms', true);
const cloudCryptoDuration = new Trend('cloud_crypto_proof_ms', true);
const localBaselineDuration = new Trend('local_baseline_duration_ms', true);
const cloudBaselineDuration = new Trend('cloud_baseline_duration_ms', true);
const localPeakDuration = new Trend('local_peak_duration_ms', true);
const cloudPeakDuration = new Trend('cloud_peak_duration_ms', true);

const localFailureRate = new Rate('local_failure_rate');
const cloudFailureRate = new Rate('cloud_failure_rate');
const localUsefulOps = new Counter('local_successful_2xx_ops');
const cloudUsefulOps = new Counter('cloud_successful_2xx_ops');
const localErrorOps = new Counter('local_failed_ops');
const cloudErrorOps = new Counter('cloud_failed_ops');
const localBaselineOps = new Counter('local_baseline_ops');
const cloudBaselineOps = new Counter('cloud_baseline_ops');
const localPeakOps = new Counter('local_peak_ops');
const cloudPeakOps = new Counter('cloud_peak_ops');

export const options = {
  stages: [
    { duration: '5s', target: BASELINE_MAX_VUS },
    { duration: '10s', target: LOAD_MAX_VUS },
    { duration: '15s', target: PEAK_VUS },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    local_failure_rate: ['rate<0.05'],
    cloud_failure_rate: ['rate<0.05'],
    local_baseline_duration_ms: ['count>0'],
    local_peak_duration_ms: ['count>0'],
    ...(CLOUDRUN_URL ? {
      cloud_baseline_duration_ms: ['count>0'],
      cloud_peak_duration_ms: ['count>0'],
    } : {}),
  },
};

function stageFor(vus) {
  if (vus <= BASELINE_MAX_VUS) return 'baseline';
  if (vus <= LOAD_MAX_VUS) return 'load';
  return 'peak';
}

function requestHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Vortex-Client': 'k6-a23-cloudrun-degradation',
    ...extra,
  };
}

function requestPayload() {
  const nonce = `${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2, 8)}`;
  return JSON.stringify({
    request_id: `bench-deg-${nonce}`,
    operation: 'inspect',
    input: {
      benchmark: 'a23_vs_cloudrun_degradation',
      device: DEVICE_LABEL,
      vu: __VU,
      iter: __ITER,
      timestamp: new Date().toISOString(),
    },
  });
}

function measureTarget(url, headers, target, stage) {
  try {
    const res = http.post(`${url}/api/vortex/execute`, requestPayload(), {
      headers,
      timeout: '10s',
      redirects: target === 'cloud' ? 0 : 10,
      tags: { target, stage },
    });

    const is2xx = res.status >= 200 && res.status < 300;
    let hasValidProof = false;
    let proofDuration = null;

    if (is2xx) {
      try {
        const body = res.json();
        if (body?.status === 'EXECUTION_SUCCESS' && body.execution_proof) {
          hasValidProof = true;
          if (typeof body.execution_proof.duration_ms === 'number') {
            proofDuration = body.execution_proof.duration_ms;
          }
        }
      } catch (_) {}
    }

    const passed = check(res, {
      [`${target} HTTP 2xx`]: () => is2xx,
      [`${target} proof valid`]: () => hasValidProof,
    });

    const raw = res.timings.duration;
    const ttfb = res.timings.waiting;

    if (target === 'local') {
      localRawDuration.add(raw);
      localTTFB.add(ttfb);
      localFailureRate.add(passed ? 0 : 1);
      if (passed) {
        localUsefulOps.add(1);
        localUsefulDuration.add(raw);
        if (proofDuration !== null) localCryptoDuration.add(proofDuration);
        if (stage === 'baseline') {
          localBaselineDuration.add(raw);
          localBaselineOps.add(1);
        } else if (stage === 'peak') {
          localPeakDuration.add(raw);
          localPeakOps.add(1);
        }
      } else {
        localErrorOps.add(1);
      }
    } else {
      cloudRawDuration.add(raw);
      cloudTTFB.add(ttfb);
      cloudFailureRate.add(passed ? 0 : 1);
      if (passed) {
        cloudUsefulOps.add(1);
        cloudUsefulDuration.add(raw);
        if (proofDuration !== null) cloudCryptoDuration.add(proofDuration);
        if (stage === 'baseline') {
          cloudBaselineDuration.add(raw);
          cloudBaselineOps.add(1);
        } else if (stage === 'peak') {
          cloudPeakDuration.add(raw);
          cloudPeakOps.add(1);
        }
      } else {
        cloudErrorOps.add(1);
      }
    }
  } catch (_) {
    if (target === 'local') {
      localFailureRate.add(1);
      localErrorOps.add(1);
    } else {
      cloudFailureRate.add(1);
      cloudErrorOps.add(1);
    }
  }
}

export default function () {
  const stage = stageFor(exec.instance.vusActive);
  measureTarget(LOCAL_URL, requestHeaders(), 'local', stage);

  if (CLOUDRUN_URL) {
    const cloudExtra = {};
    if (CLOUDRUN_TOKEN) cloudExtra.Authorization = `Bearer ${CLOUDRUN_TOKEN}`;
    if (CLOUDRUN_COOKIE) cloudExtra.Cookie = CLOUDRUN_COOKIE;
    measureTarget(CLOUDRUN_URL, requestHeaders(cloudExtra), 'cloud', stage);
  }

  sleep(0.05);
}

function metric(data, name, field, fallback = 0) {
  const value = data.metrics[name]?.values?.[field];
  return typeof value === 'number' ? value : fallback;
}

function pctDelta(peak, baseline) {
  if (!(baseline > 0) || !(peak >= 0)) return null;
  return ((peak - baseline) / baseline) * 100;
}

function ratio(a, b) {
  if (!(a > 0) || !(b > 0)) return null;
  return a / b;
}

export function handleSummary(data) {
  const lBase = metric(data, 'local_baseline_duration_ms', 'avg');
  const lPeak = metric(data, 'local_peak_duration_ms', 'avg');
  const cBase = metric(data, 'cloud_baseline_duration_ms', 'avg');
  const cPeak = metric(data, 'cloud_peak_duration_ms', 'avg');
  const lDeg = pctDelta(lPeak, lBase);
  const cDeg = pctDelta(cPeak, cBase);
  const cloudVsLocalPeak = ratio(cPeak, lPeak);
  const comparable = Boolean(CLOUDRUN_URL && cBase > 0 && cPeak > 0 && lBase > 0 && lPeak > 0);

  const report = {
    schema: 'vortex.k6.degradation.v1',
    benchmark: 'A23 vs Cloud Run',
    device: DEVICE_LABEL,
    targets: { local: LOCAL_URL, cloud_run: CLOUDRUN_URL || null },
    stages: {
      baseline_max_vus: BASELINE_MAX_VUS,
      load_max_vus: LOAD_MAX_VUS,
      peak_vus: PEAK_VUS,
    },
    local: {
      baseline_avg_ms: lBase,
      peak_avg_ms: lPeak,
      degradation_pct: lDeg,
      baseline_ops: metric(data, 'local_baseline_ops', 'count'),
      peak_ops: metric(data, 'local_peak_ops', 'count'),
      failure_rate: metric(data, 'local_failure_rate', 'rate'),
      useful_p95_ms: metric(data, 'local_useful_duration_ms', 'p(95)'),
    },
    cloud_run: {
      baseline_avg_ms: cBase,
      peak_avg_ms: cPeak,
      degradation_pct: cDeg,
      baseline_ops: metric(data, 'cloud_baseline_ops', 'count'),
      peak_ops: metric(data, 'cloud_peak_ops', 'count'),
      failure_rate: metric(data, 'cloud_failure_rate', 'rate'),
      useful_p95_ms: metric(data, 'cloud_useful_duration_ms', 'p(95)'),
    },
    comparison: {
      peak_latency_ratio_cloud_div_local: cloudVsLocalPeak,
      comparable,
      note: comparable
        ? 'Ambos os alvos produziram respostas 2xx com execution_proof.'
        : 'Sem comparação: Cloud Run precisa estar configurado e responder com execution_proof.',
    },
    raw_metrics: data.metrics,
  };

  const stdout = `
══════════════════════════════════════════════════════════════════════
 VORTEX K6 — A23/TERMUX × CLOUD RUN — DEGRADAÇÃO SOB CARGA
══════════════════════════════════════════════════════════════════════
 Device: ${DEVICE_LABEL}
 Baseline: ≤${BASELINE_MAX_VUS} VU | Load: ≤${LOAD_MAX_VUS} VU | Peak: ${PEAK_VUS} VU

                    A23 / LOCAL          CLOUD RUN
 Baseline avg       ${lBase.toFixed(2)} ms        ${cBase ? cBase.toFixed(2) : 'N/A'} ms
 Peak avg           ${lPeak.toFixed(2)} ms        ${cPeak ? cPeak.toFixed(2) : 'N/A'} ms
 Degradation        ${lDeg === null ? 'N/A' : lDeg.toFixed(1) + '%'}             ${cDeg === null ? 'N/A' : cDeg.toFixed(1) + '%'}
 Peak ratio         ${cloudVsLocalPeak === null ? 'N/A' : cloudVsLocalPeak.toFixed(2) + 'x'} (Cloud/A23)
 Fail rate          ${(metric(data, 'local_failure_rate', 'rate') * 100).toFixed(2)}%              ${(metric(data, 'cloud_failure_rate', 'rate') * 100).toFixed(2)}%
══════════════════════════════════════════════════════════════════════
 RESULTADO: ${comparable ? 'COMPARÁVEL — ambos os alvos responderam com prova' : 'NÃO COMPARÁVEL — configure/valide CLOUDRUN_URL e autenticação'}
══════════════════════════════════════════════════════════════════════
`;

  return {
    stdout,
    'k6-a23-cloudrun-degradation.json': JSON.stringify(report, null, 2),
  };
}
