#!/usr/bin/env node
/**
 * VUC LiveBench 2026 runner.
 * Contract: official LiveBench release 2026-06-25, full suite, objective scoring.
 * Inference is local when VUC_LIVEBENCH_MODEL_PATH + llama-server are available,
 * otherwise an OpenAI-compatible endpoint can be supplied.
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir, cpus, totalmem } from "node:os";
import { join } from "node:path";

const RELEASE = process.env.VUC_LIVEBENCH_RELEASE || "2026-06-25";
const LB_VERSION = process.env.VUC_LIVEBENCH_PACKAGE_VERSION || "0.0.4";
const DEFAULT_MODEL = process.env.VUC_LIVEBENCH_MODEL || "vuc-local";
const CACHE = process.env.VUC_LIVEBENCH_CACHE ||
  join(homedir(), ".cache", "vuc", `livebench-${RELEASE}-${LB_VERSION}`);
const VENV = join(CACHE, "venv");
const EVIDENCE = process.env.VUC_LIVEBENCH_EVIDENCE ||
  join(process.cwd(), "livebench-2026-evidence.json");

function die(message) {
  console.error(`VUC LiveBench: FAIL — ${message}`);
  process.exit(1);
}
function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v "${command}" >/dev/null 2>&1`]).status === 0;
}
function output(command, args) {
  const r = spawnSync(command, args, { encoding: "utf8" });
  return { ...r, text: (r.stdout || "").trim() };
}
function python() {
  for (const p of [process.env.VUC_PYTHON, "python3", "python"]) {
    if (p && (p.includes("/") ? existsSync(p) : commandExists(p))) return p;
  }
  die("Python >=3.10 is required by the official LiveBench runner");
}
function hasDocker() {
  return commandExists("docker") && output("docker", ["--version"]).status === 0;
}
function gpuInfo() {
  const llama = process.env.VUC_LIVEBENCH_LLAMA_SERVER || "llama-server";
  if (!commandExists(llama)) return { available: false, devices: [] };
  const r = output(llama, ["--list-devices"]);
  const devices = r.status === 0 ? r.text.split("\n").filter(Boolean) : [];
  const gpu = devices.filter(x => !/CPU/i.test(x));
  return { available: gpu.length > 0, devices };
}
function ensureVenv(py) {
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(join(VENV, "bin", "python"))) {
    const r = spawnSync(py, ["-m", "venv", VENV], { stdio: "inherit" });
    if (r.status !== 0) die("unable to create LiveBench virtualenv");
  }
  const vp = join(VENV, "bin", "python");
  const check = spawnSync(vp, ["-c", "import livebench"], { stdio: "ignore" });
  if (check.status !== 0) {
    const r = spawnSync(vp, ["-m", "pip", "install", "--disable-pip-version-check",
      "--no-input", `livebench==${LB_VERSION}`], { stdio: "inherit" });
    if (r.status !== 0) die(`unable to install official LiveBench package ${LB_VERSION}`);
  }
  return vp;
}
function parseArgs(argv) {
  const out = { release: RELEASE, model: DEFAULT_MODEL, bench: "live_bench",
    mode: process.env.VUC_LIVEBENCH_MODE || "sequential",
    parallel: process.env.VUC_LIVEBENCH_PARALLEL || "1",
    maxTokens: process.env.VUC_LIVEBENCH_MAX_TOKENS || "4096" };
  for (let i=0;i<argv.length;i++) {
    const a=argv[i], n=argv[i+1];
    if (a==="--release") out.release=n, i++;
    else if (a==="--model") out.model=n, i++;
    else if (a==="--bench-name") out.bench=n, i++;
    else if (a==="--api-base") out.apiBase=n, i++;
    else if (a==="--api-key") out.apiKey=n, i++;
    else if (a==="--mode") out.mode=n, i++;
    else if (a==="--parallel-requests") out.parallel=n, i++;
    else if (a==="--max-tokens") out.maxTokens=n, i++;
    else if (a==="--resume") out.resume=true;
    else if (a==="--retry-failures") out.retry=true;
    else if (a==="--help" || a==="-h") {
      console.log("vuc livebench [--release 2026-06-25] [--model NAME] [--api-base URL] [--api-key KEY] [--resume] [--retry-failures]");
      process.exit(0);
    }
  }
  return out;
}
async function main() {
  const args=parseArgs(process.argv.slice(2));
  if (args.release !== RELEASE && process.env.VUC_LIVEBENCH_ALLOW_OTHER_RELEASE !== "true") {
    die(`release ${args.release} rejected; VUC pins ${RELEASE}. Set VUC_LIVEBENCH_ALLOW_OTHER_RELEASE=true only for explicit research runs.`);
  }

  const py=python();
  const vpy=ensureVenv(py);
  const gpu=gpuInfo();
  const apiBase=args.apiBase || process.env.VUC_LIVEBENCH_API_BASE;
  const modelPath=process.env.VUC_LIVEBENCH_MODEL_PATH;
  const device=process.env.VUC_LIVEBENCH_DEVICE || "auto";

  if (!apiBase && !modelPath) {
    die("no inference source. Set VUC_LIVEBENCH_API_BASE or VUC_LIVEBENCH_MODEL_PATH");
  }

  if (args.bench === "live_bench" && !hasDocker()) {
    die("full LiveBench 2026 includes Agentic Coding; Docker is unavailable. Refusing to report a partial run as integral.");
  }

  const evidence={
    schema:"vuc-livebench-evidence/v1",
    benchmark:"LiveBench",
    release:args.release,
    package_version:LB_VERSION,
    bench_name:args.bench,
    host:{platform:process.platform,arch:process.arch,cpu_cores:cpus().length,total_memory_bytes:totalmem()},
    runtime:{device_request:device,gpu_detected:gpu.available,gpu_devices:gpu.devices,docker:hasDocker()},
    model:{id:args.model,path:modelPath || null,api_base:apiBase ? "[configured]" : null},
    status:"RUNNING",
    started_at:new Date().toISOString()
  };
  writeFileSync(EVIDENCE, JSON.stringify(evidence,null,2));

  const cmd=["-m","livebench.run_livebench","--model",args.model,
    "--bench-name",args.bench,"--livebench-release-option",args.release,
    "--max-tokens",args.maxTokens,"--mode",args.mode,"--parallel-requests",String(args.parallel)];
  if (apiBase) cmd.push("--api-base",apiBase,"--api-key",args.apiKey || process.env.VUC_LIVEBENCH_API_KEY || "dummy");
  if (args.resume) cmd.push("--resume");
  if (args.retry) cmd.push("--retry-failures");

  console.log(JSON.stringify({
    event:"VUC_LIVEBENCH_START", release:args.release, bench:args.bench,
    model:args.model, device:device, gpu_detected:gpu.available,
    cpu_cores:cpus().length, docker:hasDocker(), evidence:EVIDENCE
  },null,2));

  const r=spawnSync(vpy,cmd,{stdio:"inherit",env:{...process.env, PYTHONUNBUFFERED:"1"}});
  const final={...evidence,status:r.status===0?"PASS":"FAIL",finished_at:new Date().toISOString(),exit_code:r.status};
  writeFileSync(EVIDENCE,JSON.stringify(final,null,2));
  process.exit(r.status ?? 1);
}
main().catch(e=>die(e?.stack || String(e)));
