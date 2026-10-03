import assert from "node:assert/strict";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
assert.equal(pkg.scripts["benchmark:livebench"], "node bin/livebench.js");
assert.equal(pkg.scripts["livebench"], "node bin/livebench.js");
assert.equal(pkg.bin.vuc, "./dist/vua.cjs");
assert.ok(pkg.files.includes("scripts"));
assert.ok(fs.existsSync("bin/livebench.js"));
assert.ok(fs.existsSync("scripts/bootstrap-livebench-runtime.sh"));
const source = fs.readFileSync("bin/livebench.js","utf8");
const bootstrap = fs.readFileSync("scripts/bootstrap-livebench-runtime.sh","utf8");
for (const token of ["2026-06-25","livebench.run_livebench","VUC_LIVEBENCH_API_BASE","VUC_LIVEBENCH_MODEL_PATH","Agentic Coding","runtime bootstrap","GPU","8f8e5c381a16e3f24257776edd53471fe86f8091","github.com/LiveBench/LiveBench.git"]) {
  assert.ok(source.includes(token), `LiveBench runtime contract missing: ${token}`);
}
for (const token of ["python3","docker.io","llama-server","Qwen2.5-Coder-0.5B-Instruct-GGUF","sha256sum","VUC_LIVEBENCH_DEVICE","GPU_LAYERS"]) {
  assert.ok(bootstrap.includes(token), `Bootstrap contract missing: ${token}`);
}
console.log("LiveBench 2026 runtime + bootstrap contract: PASS");
