/**
 * Vortex Universal Adapter - Google Cloud runtime discovery and benchmark.
 *
 * Design rule:
 * - no Cloud Run URL is embedded in source;
 * - the benchmark discovers the execution environment first;
 * - AI Studio preview/proxy endpoints are never accepted as Cloud Run evidence;
 * - benchmark output contains execution/hardware context, not product verdicts.
 */

import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { canonicalizeRFC8785 } from '../canonicalize.js';
import { sha256 } from '../crypto.js';
import { detectHardwareFingerprint } from '../hardware-profiler.js';
import type { IVUAAdapter, VUAAdapterMetadata, VUAAdapterStatus } from './types.js';

interface RuntimeContext {
  provider: string;
  execution: string;
  region: string | null;
  project_id: string | null;
  service: string | null;
  revision: string | null;
  endpoint: string | null;
  endpoint_source: string | null;
}

export interface CloudRunBenchmarkResult {
  target_url: string | null;
  is_ai_studio_gateway: boolean;
  status_code: number;
  latency_ms: number;
  useful_work: boolean;
  crypto_proof_verified: boolean;
  diagnostic: string;
  runtime: RuntimeContext;
  hardware: ReturnType<typeof detectHardwareFingerprint>;
}

export interface ComparativeBenchmarkSummary {
  schema: 'vua-cloud-benchmark/v2';
  timestamp: string;
  execution: RuntimeContext;
  hardware: ReturnType<typeof detectHardwareFingerprint>;
  local_target: {
    status: string;
    iterations: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    ops_per_sec: number;
  };
  cloud_target: {
    provider: 'gcp_cloud_run' | 'custom_http';
    url: string | null;
    status: string;
    is_preview_proxy: boolean;
    avg_latency_ms: number;
    p95_latency_ms: number;
    useful_work_ratio: number;
    diagnostic: string;
  };
}

async function metadata(path: string): Promise<string | null> {
  try {
    const res = await fetch(`http://metadata.google.internal/computeMetadata/v1/${path}`, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(1500),
    });
    return res.ok ? (await res.text()).trim() : null;
  } catch {
    return null;
  }
}

async function discoverRuntimeContext(): Promise<RuntimeContext> {
  const kService = process.env.K_SERVICE || process.env.CLOUDRUN_SERVICE || null;
  const kRevision = process.env.K_REVISION || null;
  const region = process.env.K_REGION || process.env.CLOUD_RUN_REGION || null;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || await metadata('project/project-id');

  if (kService) {
    if (process.env.CLOUDRUN_URL) {
      return {
        provider: 'gcp',
        execution: 'cloud_run',
        region,
        project_id: projectId,
        service: kService,
        revision: kRevision,
        endpoint: process.env.CLOUDRUN_URL.replace(/\/$/, ''),
        endpoint_source: 'environment',
      };
    }

    if (projectId && region) {
      const token = await metadata('instance/service-accounts/default/token');
      if (token) {
        try {
          const url =
            `https://run.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(region)}/services/${encodeURIComponent(kService)}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${JSON.parse(token).access_token}` },
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            const service = await res.json() as { uri?: string };
            if (service.uri) {
              return {
                provider: 'gcp',
                execution: 'cloud_run',
                region,
                project_id: projectId,
                service: kService,
                revision: kRevision,
                endpoint: service.uri.replace(/\/$/, ''),
                endpoint_source: 'cloud_run_admin_api',
              };
            }
          }
        } catch {
          // Fall through to explicit discovery failure.
        }
      }
    }
  }

  const explicitService = process.env.CLOUDRUN_SERVICE || null;
  const explicitRegion = region || process.env.CLOUDRUN_REGION || null;
  if (explicitService && explicitRegion) {
    try {
      const url = execFileSync(
        'gcloud',
        ['run', 'services', 'describe', explicitService, '--region', explicitRegion, '--format=value(status.url)'],
        { encoding: 'utf8', timeout: 5000 },
      ).trim();
      if (url) {
        return {
          provider: 'gcp',
          execution: 'cloud_run',
          region: explicitRegion,
          project_id: projectId,
          service: explicitService,
          revision: kRevision,
          endpoint: url.replace(/\/$/, ''),
          endpoint_source: 'gcloud_service_describe',
        };
      }
    } catch {
      // Discovery failure is reported below; never invent a URL.
    }
  }

  return {
    provider: process.env.GOOGLE_CLOUD_PROJECT ? 'gcp' : 'unknown',
    execution: kService ? 'cloud_run' : 'cloud_shell_or_local',
    region: explicitRegion,
    project_id: projectId,
    service: kService,
    revision: kRevision,
    endpoint: null,
    endpoint_source: null,
  };
}

function rejectPreview(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return host.includes('ais-dev') || host.includes('ais-pre');
}

async function probeUrl(targetUrl: string): Promise<{ statusCode: number; latency: number; useful: boolean; preview: boolean; diagnostic: string }> {
  const start = performance.now();
  try {
    const res = await fetch(`${targetUrl.replace(/\/$/, '')}/api/health`, {
      method: 'GET',
      headers: { 'X-Vortex-Client': 'vua-gcloud-probe' },
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const latency = performance.now() - start;
    const location = res.headers.get('location') || '';
    const preview = res.status === 302 || rejectPreview(targetUrl) || location.includes('__cookie_check.html');
    const useful = res.status >= 200 && res.status < 300 && !preview;
    return {
      statusCode: res.status,
      latency,
      useful,
      preview,
      diagnostic: preview
        ? 'REJECTED: AI Studio preview/proxy endpoint; it is not valid Cloud Run benchmark evidence.'
        : useful
          ? 'SUCCESS: native endpoint responded to the VUA health probe.'
          : `HTTP_${res.status}: endpoint responded but did not pass the benchmark preflight.`,
    };
  } catch (err) {
    return {
      statusCode: 0,
      latency: performance.now() - start,
      useful: false,
      preview: false,
      diagnostic: `NETWORK_ERROR: ${String(err)}`,
    };
  }
}

export class VUAGCloudAdapter implements IVUAAdapter {
  public metadata: VUAAdapterMetadata = {
    id: 'gcloud',
    name: 'Google Cloud Runtime Adapter & Benchmarker',
    environment: 'GCP Cloud Run / Cloud APIs',
    version: '1.1.0',
    status: 'ready',
    description: 'Discovers the current runtime and native Cloud Run endpoint before measuring it.',
    capabilities: ['gcloud.bench', 'gcloud.cloudrun.probe', 'gcloud.freetier.audit', 'vua.adapter.read', 'vua.adapter.execute'],
    supportedActions: [
      {
        action: 'probe_endpoint',
        description: 'Discover and audit a native Cloud Run endpoint; preview proxies are rejected.',
        defaultParams: {},
      },
      {
        action: 'compare_bench',
        description: 'Measure local crypto work and a discovered native Cloud Run health path.',
        defaultParams: { iterations: 10 },
      },
      {
        action: 'free_tier_limits',
        description: 'Inspect configured GCP Cloud Run free-tier reference values.',
        defaultParams: {},
      },
    ],
    systemMetrics: {
      free_tier_requests_monthly: 2000000,
      free_tier_gib_seconds: 360000,
      free_tier_vcpu_seconds: 180000,
      supported_regions: 'runtime-discovered',
    },
  };

  public async probeStatus(): Promise<{ status: VUAAdapterStatus; metrics?: Record<string, string | number> }> {
    return {
      status: 'ready',
      metrics: {
        engine: 'VUA Native Fetch',
        local_arch: os.arch(),
        local_cpus: os.cpus().length,
        endpoint_discovery: 'runtime/gcloud/admin-api',
      },
    };
  }

  public async executeAction(action: string, target?: Record<string, unknown>, payload?: Record<string, unknown>): Promise<{ data: Record<string, unknown>; auditLog: string[] }> {
    const auditLog: string[] = [`gcloud:action:${action}:start`];

    if (action === 'free_tier_limits') {
      return {
        data: {
          provider: 'Google Cloud Platform (GCP)',
          product: 'Cloud Run',
          tier: 'Always Free',
          monthly_allowances: {
            requests: '2,000,000 requests/month',
            memory: '360,000 GiB-seconds/month',
            cpu: '180,000 vCPU-seconds/month',
            egress_north_america: '1 GiB/month',
          },
          constraints: { min_instances: 0, scale_to_zero_cost: '$0.00' },
          endpoint_policy: 'runtime discovery only; no URL is embedded in source',
        },
        auditLog: [...auditLog, 'gcloud:free_tier_limits:retrieved'],
      };
    }

    const runtime = await discoverRuntimeContext();
    const requestedUrl = String(payload?.url || target?.url || '').trim();
    const targetUrl = requestedUrl || runtime.endpoint;

    if (action === 'probe_endpoint') {
      if (!targetUrl) {
        return {
          data: {
            target_url: null,
            is_ai_studio_gateway: false,
            status_code: 0,
            latency_ms: 0,
            useful_work: false,
            crypto_proof_verified: false,
            diagnostic: 'DISCOVERY_REQUIRED: no endpoint was supplied and the current runtime could not discover a Cloud Run service URL.',
            runtime,
            hardware: detectHardwareFingerprint(),
          },
          auditLog: [...auditLog, 'gcloud:probe_endpoint:discovery_failed'],
        };
      }

      const probe = await probeUrl(targetUrl);
      return {
        data: {
          target_url: targetUrl,
          is_ai_studio_gateway: probe.preview,
          status_code: probe.statusCode,
          latency_ms: Number(probe.latency.toFixed(3)),
          useful_work: probe.useful,
          crypto_proof_verified: false,
          diagnostic: probe.diagnostic,
          runtime,
          hardware: detectHardwareFingerprint(),
        },
        auditLog: [...auditLog, `gcloud:probe_endpoint:finished:code=${probe.statusCode}:useful=${probe.useful}`],
      };
    }

    if (action === 'compare_bench') {
      const iterations = Number(payload?.iterations || target?.iterations || 10);
      if (!targetUrl) {
        return {
          data: {
            schema: 'vua-cloud-benchmark/v2',
            timestamp: new Date().toISOString(),
            execution: runtime,
            hardware: detectHardwareFingerprint(),
            local_target: { status: 'ONLINE', iterations, avg_latency_ms: 0, p95_latency_ms: 0, ops_per_sec: 0 },
            cloud_target: {
              provider: 'gcp_cloud_run',
              url: null,
              status: 'DISCOVERY_REQUIRED',
              is_preview_proxy: false,
              avg_latency_ms: 0,
              p95_latency_ms: 0,
              useful_work_ratio: 0,
              diagnostic: 'No native Cloud Run endpoint discovered. Benchmark not executed.',
            },
          },
          auditLog: [...auditLog, 'gcloud:compare_bench:discovery_failed'],
        };
      }

      const preflight = await probeUrl(targetUrl);
      if (!preflight.useful) {
        return {
          data: {
            schema: 'vua-cloud-benchmark/v2',
            timestamp: new Date().toISOString(),
            execution: runtime,
            hardware: detectHardwareFingerprint(),
            local_target: { status: 'ONLINE', iterations, avg_latency_ms: 0, p95_latency_ms: 0, ops_per_sec: 0 },
            cloud_target: {
              provider: 'gcp_cloud_run',
              url: targetUrl,
              status: preflight.preview ? 'REJECTED_PREVIEW_PROXY' : `PREFLIGHT_FAILED_${preflight.statusCode}`,
              is_preview_proxy: preflight.preview,
              avg_latency_ms: Number(preflight.latency.toFixed(3)),
              p95_latency_ms: Number(preflight.latency.toFixed(3)),
              useful_work_ratio: 0,
              diagnostic: preflight.diagnostic,
            },
          },
          auditLog: [...auditLog, 'gcloud:compare_bench:preflight_failed'],
        };
      }

      const localLatencies: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        const payload = {
          nonce: `bench-local-${i}-${Date.now()}`,
          iteration: i,
          system: { arch: os.arch(), platform: os.platform() },
        };
        sha256(canonicalizeRFC8785(payload));
        localLatencies.push(performance.now() - t0);
      }
      localLatencies.sort((a, b) => a - b);
      const localAvg = localLatencies.reduce((s, v) => s + v, 0) / localLatencies.length;
      const localP95 = localLatencies[Math.min(localLatencies.length - 1, Math.floor(localLatencies.length * 0.95))];

      const cloudSamples: number[] = [];
      let usefulWorkCount = 0;
      for (let i = 0; i < Math.min(iterations, 5); i++) {
        const p = await probeUrl(targetUrl);
        cloudSamples.push(p.latency);
        if (p.useful) usefulWorkCount++;
      }
      cloudSamples.sort((a, b) => a - b);
      const cloudAvg = cloudSamples.reduce((s, v) => s + v, 0) / cloudSamples.length;
      const cloudP95 = cloudSamples[Math.min(cloudSamples.length - 1, Math.floor(cloudSamples.length * 0.95))];

      const fp = detectHardwareFingerprint();
      const summary: ComparativeBenchmarkSummary = {
        schema: 'vua-cloud-benchmark/v2',
        timestamp: new Date().toISOString(),
        execution: runtime,
        hardware: fp,
        local_target: {
          status: 'ONLINE',
          iterations,
          avg_latency_ms: Number(localAvg.toFixed(3)),
          p95_latency_ms: Number(localP95.toFixed(3)),
          ops_per_sec: Math.round(1000 / localAvg),
        },
        cloud_target: {
          provider: 'gcp_cloud_run',
          url: targetUrl,
          status: 'ONLINE_NATIVE',
          is_preview_proxy: false,
          avg_latency_ms: Number(cloudAvg.toFixed(3)),
          p95_latency_ms: Number(cloudP95.toFixed(3)),
          useful_work_ratio: Number((usefulWorkCount / cloudSamples.length).toFixed(2)),
          diagnostic: 'Native Cloud Run endpoint passed preflight.',
        },
      };

      auditLog.push('gcloud:compare_bench:finished');
      return { data: summary as unknown as Record<string, unknown>, auditLog };
    }

    throw new Error(`Ação não suportada pelo adaptador gcloud: ${action}`);
  }
}
