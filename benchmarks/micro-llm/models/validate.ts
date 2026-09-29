import fs from "node:fs";
import path from "node:path";

type Model = {
  model_id:string; parameters:number; license:string; architecture:string;
  format:string; quantization:string; source:string; track:string;
};

const file = path.resolve("benchmarks/micro-llm/models/manifest.json");
const models = JSON.parse(fs.readFileSync(file,"utf8")) as Model[];
if (!Array.isArray(models)) throw new Error("manifest must be an array");

const errors:string[] = [];
for (const m of models) {
  if (!m.model_id || !m.license || !m.source) errors.push(`${m.model_id || "<unknown>"}: missing identity/license/source`);
  if (!Number.isInteger(m.parameters) || m.parameters <= 0) errors.push(`${m.model_id}: invalid parameters`);
  const expected = m.parameters <= 500_000_000 ? "native-500m" : "large-quantized";
  if (m.track !== expected) errors.push(`${m.model_id}: track mismatch; expected ${expected}`);
  if (m.track === "native-500m" && m.parameters > 500_000_000) errors.push(`${m.model_id}: native parameter limit exceeded`);
}
if (errors.length) {
  console.error(JSON.stringify({status:"FAIL", errors}, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  status:"PASS",
  total_models_discovered:models.length,
  total_models_eligible_native_500m:models.filter(m=>m.track==="native-500m").length,
  total_models_rejected:0
},null,2));
