import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type RuntimeResult = {
  model_loaded:boolean;
  tokens_generated:number;
  startup_ms:number;
  latency_ms:number;
  proof_verification:"PASS"|"FAIL";
  prompt_tokens?:number;
  prompt_tokens_per_second?:number;
  generation_tokens_per_second?:number;
  rss_bytes?:number;
  output_bytes?:number;
  output_valid_json?:boolean;
  runtime?:string;
  execution_kind?:string;
  proof_scope?:string;
};

const command=process.env.VUC_LLM_COMMAND;
const model=process.env.VUC_LLM_MODEL ?? "";
const timeoutMs=Number(process.env.VUC_LLM_TIMEOUT_MS ?? 120000);
if (!command || !model) {
  console.error(JSON.stringify({status:"BLOCKED",reason:"VUC_LLM_COMMAND and VUC_LLM_MODEL are required for real inference"},null,2));
  process.exit(2);
}

const sandbox=await mkdtemp(path.join(os.tmpdir(),"vuc-llm-agent-"));
const executionId="llm-"+Date.now()+"-"+process.pid;
const started=Date.now();

try {
  await writeFile(path.join(sandbox,"request.json"),JSON.stringify({
    execution_id:executionId, model_id:model, task_id:process.env.VUC_LLM_TASK ?? "smoke",
    sandbox_id:path.basename(sandbox)
  })+"\n");

  const result=await new Promise<{code:number;stdout:string;stderr:string}>((resolve)=>{
    const child=spawn("bash",["-lc",command],{
      cwd:sandbox, env:{...process.env,VUC_SANDBOX:sandbox,VUC_EXECUTION_ID:executionId},
      stdio:["ignore","pipe","pipe"]
    });
    let stdout="",stderr="";
    child.stdout.on("data",d=>stdout+=d);
    child.stderr.on("data",d=>stderr+=d);
    const timer=setTimeout(()=>{child.kill("SIGTERM");resolve({code:124,stdout,stderr});},timeoutMs);
    child.on("close",code=>{clearTimeout(timer);resolve({code:code??1,stdout,stderr});});
  });

  if (result.code!==0) {
    console.error(JSON.stringify({status:"FAIL",execution_id:executionId,exit_code:result.code,stderr:result.stderr.slice(-4000)},null,2));
    process.exit(1);
  }

  let payload:RuntimeResult;
  try { payload=JSON.parse(result.stdout.trim()); }
  catch { console.error(JSON.stringify({status:"FAIL",reason:"runtime must emit JSON evidence",stdout:result.stdout.slice(-4000)},null,2)); process.exit(1); }

  const evidence={
    execution_id:executionId,
    agent_id:process.env.VUC_AGENT_ID??("agent-"+process.pid),
    runtime_id:process.env.VUC_RUNTIME_ID??"micro-llm-runtime",
    sandbox_id:path.basename(sandbox),
    model_id:model,
    task_id:process.env.VUC_LLM_TASK??"smoke",
    process_id:process.pid,
    model_loaded:payload.model_loaded,
    tokens_generated:payload.tokens_generated,
    prompt_tokens:payload.prompt_tokens??0,
    startup_ms:payload.startup_ms,
    latency_ms:payload.latency_ms,
    prompt_tokens_per_second:payload.prompt_tokens_per_second??0,
    generation_tokens_per_second:payload.generation_tokens_per_second??0,
    rss_bytes:payload.rss_bytes??0,
    output_bytes:payload.output_bytes??0,
    output_valid_json:payload.output_valid_json??false,
    exit_code:result.code,
    proof_verification:payload.proof_verification,
    proof_scope:payload.proof_scope??"not-specified",
    runtime:payload.runtime??"unknown",
    execution_kind:payload.execution_kind??"real_model_inference",
    status: payload.model_loaded && payload.tokens_generated>0 && payload.proof_verification==="PASS" ? "PASS" : "FAIL",
    elapsed_wrapper_ms:Date.now()-started
  };
  console.log(JSON.stringify(evidence,null,2));
  if (evidence.status!=="PASS") process.exit(1);
} finally {
  await rm(sandbox,{recursive:true,force:true});
}
