import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Evidence = {
  execution_id?: string;
  model_id?: string;
  process_id?: number;
  tokens_generated?: number;
  prompt_tokens?: number;
  startup_ms?: number;
  latency_ms?: number;
  prompt_tokens_per_second?: number;
  generation_tokens_per_second?: number;
  rss_bytes?: number;
  cpu_user_ms?: number;
  cpu_system_ms?: number;
  cpu_percent?: number;
  output_bytes?: number;
  output_valid_json?: boolean;
  proof_verification?: "PASS" | "FAIL";
  status?: "PASS" | "FAIL";
};

type RunResult = {
  n: number;
  repetition: number;
  worker: number;
  status: "PASS" | "FAIL";
  wall_ms: number;
  evidence: Evidence | null;
  stderr: string;
};

const ROOT = process.env.VUC_REPO_ROOT ?? process.cwd();
const RUNNER = path.resolve(ROOT, "benchmarks/micro-llm/runtime/run.ts");
const MODEL_PATH = process.env.VUC_CAPACITY_MODEL_PATH;
const MODEL_ID = process.env.VUC_CAPACITY_MODEL_ID ?? "unknown";
const LLAMA_SERVER = process.env.VUC_CAPACITY_LLAMA_SERVER;
const OUT_DIR = process.env.VUC_CAPACITY_OUTPUT_DIR ?? path.resolve(ROOT, "reports/micro-llm-capacity");
const BASE_PORT = Number(process.env.VUC_CAPACITY_BASE_PORT ?? 18080);
const TIMEOUT_MS = Number(process.env.VUC_LLM_TIMEOUT_MS ?? 180000);
const THREADS = Number(process.env.VUC_LLAMA_THREADS ?? 4);
const repetitions = Number(process.env.VUC_CAPACITY_REPETITIONS ?? 3);
const concurrency = (process.env.VUC_CAPACITY_LEVELS ?? "1,2,4,6,8").split(",").map(Number).filter(Number.isInteger);

if (!MODEL_PATH || !LLAMA_SERVER) throw new Error("VUC_CAPACITY_MODEL_PATH and VUC_CAPACITY_LLAMA_SERVER are required");
if (!concurrency.length || concurrency.some(n => n < 1)) throw new Error("VUC_CAPACITY_LEVELS must contain positive integers");
if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error("VUC_CAPACITY_REPETITIONS must be >= 1");

const shellQuote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";

async function runOne(n: number, repetition: number, worker: number): Promise<RunResult> {
  const dir = path.join(OUT_DIR, `n-${n}`, `rep-${repetition}`, `worker-${worker}`);
  await mkdir(dir, { recursive: true });
  const port = BASE_PORT + (n * 100) + (repetition * 10) + worker;
  const command = [
    "chmod +x", shellQuote(path.join(ROOT, "benchmarks/micro-llm/runtime/run-llama-server.sh")), "&&",
    shellQuote(path.join(ROOT, "benchmarks/micro-llm/runtime/run-llama-server.sh")),
    shellQuote(MODEL_PATH), shellQuote(LLAMA_SERVER), String(port), "$VUC_SANDBOX"
  ].join(" ");

  const started = Date.now();
  const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.env.npm_execpath || "npm", ["exec", "--", "tsx", RUNNER], {
      cwd: ROOT,
      env: {
        ...process.env,
        VUC_LLM_COMMAND: command,
        VUC_LLM_MODEL: MODEL_ID,
        VUC_LLM_TASK: "capacity-json-capability-proposal",
        VUC_LLM_TIMEOUT_MS: String(TIMEOUT_MS),
        VUC_REPO_ROOT: ROOT,
        VUC_EVIDENCE_DIR: dir,
        VUC_LLAMA_THREADS: String(THREADS),
        VUC_CAPACITY_WORKER: String(worker)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", d => stdout += d);
    child.stderr.on("data", d => stderr += d);
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ code: 124, stdout, stderr: stderr + "\ncapacity runner timeout" });
    }, TIMEOUT_MS + 30000);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });

  const wall_ms = Date.now() - started;
  let evidence: Evidence | null = null;
  try { evidence = JSON.parse(result.stdout.trim()) as Evidence; } catch {}

  const status = result.code === 0 && evidence?.status === "PASS" && evidence.proof_verification === "PASS"
    ? "PASS" : "FAIL";

  await writeFile(path.join(dir, "runner-result.json"), JSON.stringify({
    n, repetition, worker, status, wall_ms, exit_code: result.code,
    evidence, stderr: result.stderr.slice(-8000)
  }, null, 2) + "\n");

  return { n, repetition, worker, status, wall_ms, evidence, stderr: result.stderr.slice(-8000) };
}

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index), hi = Math.ceil(index);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
};

const levels: any[] = [];
let executionCounter = 0;

for (const n of concurrency) {
  const repetitionsResults: RunResult[][] = [];
  for (let rep = 1; rep <= repetitions; rep++) {
    const results = await Promise.all(Array.from({ length: n }, (_, i) => runOne(n, rep, i + 1)));
    executionCounter += results.length;
    repetitionsResults.push(results);
  }

  const flat = repetitionsResults.flat();
  const evidences = flat.map(x => x.evidence).filter((x): x is Evidence => !!x);
  const latencies = evidences.map(x => Number(x.latency_ms ?? 0)).filter(x => x > 0);
  const startups = evidences.map(x => Number(x.startup_ms ?? 0)).filter(x => x > 0);
  const rss = evidences.map(x => Number(x.rss_bytes ?? 0)).filter(x => x > 0);
  const cpu = evidences.map(x => Number(x.cpu_percent ?? 0)).filter(x => x >= 0);
  const tokens = evidences.map(x => Number(x.tokens_generated ?? 0)).filter(x => x > 0);
  const genRates = evidences.map(x => Number(x.generation_tokens_per_second ?? 0)).filter(x => x > 0);
  const proofPass = flat.filter(x => x.evidence?.proof_verification === "PASS").length;
  const failures = flat.length - flat.filter(x => x.status === "PASS").length;
  const wall_ms = Math.max(...flat.map(x => x.wall_ms), 0);
  const aggregate_tps = wall_ms > 0 ? (tokens.reduce((a, b) => a + b, 0) / wall_ms) * 1000 : 0;

  levels.push({
    n,
    repetitions,
    executions: flat.length,
    passes: flat.filter(x => x.status === "PASS").length,
    failures,
    error_rate: flat.length ? failures / flat.length : 1,
    proof_passes: proofPass,
    proof_failures: flat.length - proofPass,
    throughput_tokens_per_second: aggregate_tps,
    generation_tokens_per_second: {
      mean: genRates.length ? genRates.reduce((a, b) => a + b, 0) / genRates.length : 0,
      p50: percentile(genRates, .50),
      p95: percentile(genRates, .95),
      p99: percentile(genRates, .99)
    },
    latency_ms: {
      p50: percentile(latencies, .50),
      p95: percentile(latencies, .95),
      p99: percentile(latencies, .99),
      max: latencies.length ? Math.max(...latencies) : null
    },
    startup_ms: {
      p50: percentile(startups, .50),
      p95: percentile(startups, .95),
      max: startups.length ? Math.max(...startups) : null
    },
    rss_bytes: {
      p50: percentile(rss, .50),
      p95: percentile(rss, .95),
      max: rss.length ? Math.max(...rss) : null,
      aggregate_max: rss.reduce((a, b) => a + b, 0)
    },
    cpu_percent: {
      p50: percentile(cpu, .50),
      p95: percentile(cpu, .95),
      max: cpu.length ? Math.max(...cpu) : null
    },
    wall_ms,
    execution_ids: evidences.map(x => x.execution_id).filter(Boolean),
    results: flat.map(x => ({
      worker: x.worker,
      repetition: x.repetition,
      status: x.status,
      wall_ms: x.wall_ms,
      execution_id: x.evidence?.execution_id ?? null,
      proof_verification: x.evidence?.proof_verification ?? null
    }))
  });
}

const technical = levels.filter(x => x.failures === 0 && x.proof_failures === 0).map(x => x.n);
const nTechnical = technical.length ? Math.max(...technical) : null;

const num = (name: string) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};
const maxP95 = num("VUC_MAX_P95_LATENCY_MS");
const maxRSS = num("VUC_MAX_RSS_BYTES");
const maxError = num("VUC_MAX_ERROR_RATE");
const minThroughputRatio = num("VUC_MIN_THROUGHPUT_RATIO");
const productiveP95 = num("VUC_PRODUCTIVE_SLA_P95_MS");
const productiveError = num("VUC_PRODUCTIVE_MAX_ERROR_RATE");
const productiveThroughput = num("VUC_PRODUCTIVE_MIN_THROUGHPUT_TPS");

const baseline = levels.find(x => x.n === 1);
const sustainable = levels.filter(x => {
  if (!baseline || maxP95 === null || maxRSS === null || maxError === null || minThroughputRatio === null) return false;
  return x.failures === 0 &&
    x.latency_ms.p95 <= maxP95 &&
    x.rss_bytes.max <= maxRSS &&
    x.error_rate <= maxError &&
    x.throughput_tokens_per_second >= baseline.throughput_tokens_per_second * minThroughputRatio;
}).map(x => x.n);

const productive = levels.filter(x => {
  if (productiveP95 === null || productiveError === null || productiveThroughput === null) return false;
  return x.failures === 0 &&
    x.latency_ms.p95 <= productiveP95 &&
    x.error_rate <= productiveError &&
    x.throughput_tokens_per_second >= productiveThroughput;
}).map(x => x.n);

const higherLevelFailures = levels.filter(x => x.n > (nTechnical ?? 0) && x.failures > 0);
const certifiedBoundary = higherLevelFailures.some(x => x.failures > 0 && x.proof_failures === 0) && nTechnical !== null;
const report = {
  schema_version: "vuc-micro-llm-capacity-v1",
  status: baseline && baseline.failures === 0 && baseline.proof_failures === 0 ? "MEASURED" : "FAIL",
  data_quality: levels.some(x => x.proof_failures > 0) ? "UNPROVEN_FAILURE_PRESENT" : "VALID",
  model_id: MODEL_ID,
  model_path: MODEL_PATH,
  runtime: "llama.cpp",
  concurrency_levels: concurrency,
  repetitions,
  llama_threads_per_execution: THREADS,
  levels,
  capacity: {
    n_technical: nTechnical,
    n_technical_boundary_status: certifiedBoundary ? "CERTIFIED" : "UNRESOLVED_NO_VALID_PROOFED_FAILURE",
    n_sustainable: sustainable.length ? Math.max(...sustainable) : null,
    n_productive: productive.length ? Math.max(...productive) : null,
    n_sustainable_status: maxP95 !== null && maxRSS !== null && maxError !== null && minThroughputRatio !== null ? "MEASURED" : "UNDEFINED_NO_SLO",
    n_productive_status: productiveP95 !== null && productiveError !== null && productiveThroughput !== null ? "MEASURED" : "UNDEFINED_NO_SLA",
    sustainable_criteria: {
      max_p95_latency_ms: maxP95,
      max_rss_bytes: maxRSS,
      max_error_rate: maxError,
      min_throughput_ratio_vs_n1: minThroughputRatio
    },
    productive_criteria: {
      p95_latency_ms: productiveP95,
      max_error_rate: productiveError,
      min_throughput_tokens_per_second: productiveThroughput
    }
  },
  execution_count: executionCounter,
  fail_closed: true,
  generated_at: new Date().toISOString()
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "capacity-results.json"), JSON.stringify(report, null, 2) + "\n");

const summaryLines = [
  "# Micro-LLM Capacity Benchmark Summary",
  "",
  `Model: ${MODEL_ID}`,
  `Runtime: llama.cpp`,
  `Levels: ${concurrency.join(", ")}`,
  `Repetitions: ${repetitions}`,
  "",
  "## Observed levels",
  "",
  "| N | executions | passes | failures | error rate | throughput tok/s | latency p50 | latency p95 | latency p99 | RSS max | CPU p95 | proof failures |",
  "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...levels.map(x => `| ${x.n} | ${x.executions} | ${x.passes} | ${x.failures} | ${x.error_rate} | ${x.throughput_tokens_per_second.toFixed(2)} | ${x.latency_ms.p50 ?? "n/a"} | ${x.latency_ms.p95 ?? "n/a"} | ${x.latency_ms.p99 ?? "n/a"} | ${x.rss_bytes.max ?? "n/a"} | ${x.cpu_percent.p95 ?? "n/a"} | ${x.proof_failures} |`),
  "",
  "## Capacity",
  "",
  `N_technical observed maximum PASS: ${nTechnical ?? "not established"}`,
  `N_technical boundary: ${certifiedBoundary ? "CERTIFIED" : "UNRESOLVED — no higher-level failed execution with valid ExecutionProof"}`,
  `N_sustainable: ${report.capacity.n_sustainable ?? "not measured — explicit SLO required"}`,
  `N_productive: ${report.capacity.n_productive ?? "not measured — explicit SLA required"}`,
  "",
  "## Fail-closed interpretation",
  "",
  "- A PASS requires real model output, valid JSON and valid ExecutionProof.",
  "- A timeout or failure without valid ExecutionProof is preserved as evidence but does not certify the capacity boundary.",
  "- No N_sustainable or N_productive value is fabricated without explicit thresholds.",
  ""
].join("\n");

await writeFile(path.join(OUT_DIR, "capacity-summary.md"), summaryLines + "\n");
console.log(JSON.stringify(report, null, 2));

if (report.status !== "MEASURED") process.exit(1);
