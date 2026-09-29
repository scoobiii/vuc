import fs from "node:fs";
import path from "node:path";
type Model = { model_id:string; native_parameters:number; stored_parameters:number; license:string; architecture:string; format:string; quantization:string; source:string; file:string; sha256:string; track:string; verified:boolean; };
const models = JSON.parse(fs.readFileSync(path.resolve("benchmarks/micro-llm/models/manifest.json"),"utf8")) as Model[];
if (!Array.isArray(models)) throw new Error("manifest must be an array");
const errors:string[]=[]; const ids=new Set<string>();
for(const m of models){
  if(ids.has(m.model_id)) errors.push(`${m.model_id}: duplicate model_id`); ids.add(m.model_id);
  if(!m.model_id||!m.license||!m.source||!m.file) errors.push(`${m.model_id||"<unknown>"}: missing identity/license/source/file`);
  if(!Number.isInteger(m.native_parameters)||m.native_parameters<=0) errors.push(`${m.model_id}: invalid native_parameters`);
  if(!Number.isInteger(m.stored_parameters)||m.stored_parameters<=0) errors.push(`${m.model_id}: invalid stored_parameters`);
  if(m.native_parameters!==m.stored_parameters) errors.push(`${m.model_id}: native/stored parameter mismatch`);
  if(m.track!=="native-500m") errors.push(`${m.model_id}: only native-500m is enabled in this CI track`);
  if(m.native_parameters>500_000_000) errors.push(`${m.model_id}: native parameter limit exceeded`);
  if(m.format!=="GGUF") errors.push(`${m.model_id}: benchmark requires GGUF`);
  if(!/^[0-9a-f]{64}$/.test(m.sha256)) errors.push(`${m.model_id}: invalid sha256`);
  if(!m.verified) errors.push(`${m.model_id}: model is not verified`);
}
if(models.length<2) errors.push("native-500m benchmark requires at least 2 models");
if(errors.length){console.error(JSON.stringify({status:"FAIL",errors},null,2));process.exit(1);}
console.log(JSON.stringify({status:"PASS",total_models_discovered:models.length,total_models_eligible_native_500m:models.length,models:models.map(m=>({model_id:m.model_id,native_parameters:m.native_parameters,stored_parameters:m.stored_parameters,quantization:m.quantization}))},null,2));
