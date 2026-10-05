#!/usr/bin/env node
/**
 * VUC LiveBench 2026 runner.
 * Pins the 2026-06-25 release and provisions the host runtime before execution.
 * Full-suite runs fail closed when Agentic Coding cannot obtain a container runtime.
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { homedir, cpus, totalmem } from "node:os";
import { join } from "node:path";

const RELEASE = process.env.VUC_LIVEBENCH_RELEASE || "2026-06-25";
const LB_REPO = "https://github.com/LiveBench/LiveBench.git";
const LB_REF = process.env.VUC_LIVEBENCH_REF || "8f8e5c381a16e3f24257776edd53471fe86f8091";
const DEFAULT_MODEL = process.env.VUC_LIVEBENCH_MODEL || "vuc-local";
const CACHE = process.env.VUC_LIVEBENCH_CACHE || join(homedir(), ".cache", "vuc", `livebench-${RELEASE}`);
const EVIDENCE = process.env.VUC_LIVEBENCH_EVIDENCE || join(process.cwd(), "livebench-2026-evidence.json");
const BOOTSTRAP = new URL("../scripts/bootstrap-livebench-runtime.sh", import.meta.url).pathname;

function die(message) { console.error(`VUC LiveBench: FAIL — ${message}`); process.exit(1); }
function commandExists(command) { return spawnSync("sh", ["-lc", `command -v "${command}" >/dev/null 2>&1`]).status === 0; }
function output(command, args) { const r=spawnSync(command,args,{encoding:"utf8"}); return {...r,text:(r.stdout||"").trim()}; }
function python() {
  for (const p of [process.env.VUC_PYTHON,"python3","python"]) {
    if (p && (p.includes("/") ? existsSync(p) : commandExists(p))) return p;
  }
  die("Python >=3.10 is required");
}
function loadRuntimeEnv() {
  const envFile=join(process.env.VUC_LIVEBENCH_CACHE || join(homedir(), ".cache", "vuc", "livebench-runtime"),"runtime.env");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile,"utf8").split("\n")) {
    const i=line.indexOf("="); if (i<1) continue;
    const k=line.slice(0,i), v=line.slice(i+1);
    if (!process.env[k]) process.env[k]=v;
  }
}
function bootstrap() {
  mkdirSync(CACHE,{recursive:true});
  const r=spawnSync("bash",[BOOTSTRAP],{stdio:"inherit",env:{...process.env,VUC_LIVEBENCH_RELEASE:RELEASE}});
  if (r.status!==0) die("runtime bootstrap failed");
  loadRuntimeEnv();
}
function ensureVenv(py) {
  const venv=join(CACHE,"venv"); mkdirSync(CACHE,{recursive:true});
  if (!existsSync(join(venv,"bin","python"))) {
    const r=spawnSync(py,["-m","venv",venv],{stdio:"inherit"});
    if (r.status!==0) die("unable to create LiveBench virtualenv");
  }
  const vp=join(venv,"bin","python");
  if (spawnSync(vp,["-c","import livebench"],{stdio:"ignore"}).status!==0) {
    const r=spawnSync(vp,["-m","pip","install","--disable-pip-version-check","--no-input",`livebench==${LB_VERSION}`],{stdio:"inherit"});
    if (r.status!==0) die(`unable to install LiveBench package ${LB_VERSION}`);
  }
  return vp;
}
function parseArgs(argv) {
  const out={release:RELEASE,model:DEFAULT_MODEL,bench:"live_bench",mode:process.env.VUC_LIVEBENCH_MODE||"sequential",parallel:process.env.VUC_LIVEBENCH_PARALLEL||"1",maxTokens:process.env.VUC_LIVEBENCH_MAX_TOKENS||"4096"};
  for(let i=0;i<argv.length;i++){const a=argv[i],n=argv[i+1];
    if(a==="--release")out.release=n,i++; else if(a==="--model")out.model=n,i++; else if(a==="--bench-name")out.bench=n,i++;
    else if(a==="--api-base")out.apiBase=n,i++; else if(a==="--api-key")out.apiKey=n,i++; else if(a==="--mode")out.mode=n,i++;
    else if(a==="--parallel-requests")out.parallel=n,i++; else if(a==="--max-tokens")out.maxTokens=n,i++;
    else if(a==="--resume")out.resume=true; else if(a==="--retry-failures")out.retry=true;
    else if(a==="--no-bootstrap")out.noBootstrap=true;
    else if(a==="--help"||a==="-h"){console.log("vuc livebench [--release 2026-06-25] [--resume] [--retry-failures] [--no-bootstrap]");process.exit(0);}
  } return out;
}
function startLocalServer(model, device, gpuLayers) {
  const llama=process.env.VUC_LIVEBENCH_LLAMA_SERVER;
  if(!llama || !existsSync(llama)) die("llama-server not provisioned");
  const port=process.env.VUC_LIVEBENCH_PORT||"8080";
  const args=["-m",model,"--host","127.0.0.1","--port",port,"-c",process.env.VUC_LIVEBENCH_CONTEXT||"2048","-np","1"];
  if(device==="gpu") args.push("-ngl",String(gpuLayers||999));
  const child=spawn(llama,args,{stdio:"inherit",detached:true});
  child.unref();
  const base=`http://127.0.0.1:${port}/v1`;
  for(let i=0;i<60;i++){
    const r=spawnSync("curl",["-fsS",`http://127.0.0.1:${port}/health`],{stdio:"ignore"});
    if(r.status===0) return base;
    spawnSync("sleep",["1"]);
  }
  die("local llama-server did not become healthy");
}
async function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args.release!==RELEASE && process.env.VUC_LIVEBENCH_ALLOW_OTHER_RELEASE!=="true") die(`release ${args.release} rejected; VUC pins ${RELEASE}`);
  if(!args.noBootstrap) bootstrap();
  loadRuntimeEnv();
  const py=python(), vpy=ensureVenv(py);
  const modelPath=process.env.VUC_LIVEBENCH_MODEL_PATH;
  const device=process.env.VUC_LIVEBENCH_DEVICE||"cpu";
  const gpuLayers=process.env.VUC_LIVEBENCH_GPU_LAYERS||"0";
  const apiBase=args.apiBase||process.env.VUC_LIVEBENCH_API_BASE||(modelPath?startLocalServer(modelPath,device,gpuLayers):null);
  if(!apiBase) die("no local model/API source after bootstrap");
  const docker=commandExists("docker")&&output("docker",["info"]).status===0;
  if(args.bench==="live_bench"&&!docker) die("full LiveBench 2026 includes Agentic Coding; container runtime unavailable; refusing a partial run");
  const evidence={schema:"vuc-livebench-evidence/v2",benchmark:"LiveBench",release:args.release,source_ref:LB_REF,bench_name:args.bench,host:{platform:process.platform,arch:process.arch,cpu_cores:cpus().length,total_memory_bytes:totalmem()},runtime:{device,gpu_layers:Number(gpuLayers),docker},model:{id:args.model,path:modelPath||null,api_base:apiBase.replace(/:\/\/.*@/,"//[redacted]")},status:"RUNNING",started_at:new Date().toISOString()};
  writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2));
  const cmd=["-m","livebench.run_livebench","--model",args.model,"--bench-name",args.bench,"--livebench-release-option",args.release,"--max-tokens",args.maxTokens,"--mode",args.mode,"--parallel-requests",String(args.parallel),"--api-base",apiBase,"--api-key",args.apiKey||process.env.VUC_LIVEBENCH_API_KEY||"dummy"];
  if(args.resume)cmd.push("--resume"); if(args.retry)cmd.push("--retry-failures");
  console.log(JSON.stringify({event:"VUC_LIVEBENCH_START",release:args.release,bench:args.bench,device,gpu_layers:Number(gpuLayers),docker,evidence:EVIDENCE},null,2));
  const r=spawnSync(vpy,cmd,{stdio:"inherit",env:{...process.env,PYTHONUNBUFFERED:"1"}});
  writeFileSync(EVIDENCE,JSON.stringify({...evidence,status:r.status===0?"PASS":"FAIL",finished_at:new Date().toISOString(),exit_code:r.status},null,2));
  process.exit(r.status??1);
}
main().catch(e=>die(e?.stack||String(e)));
