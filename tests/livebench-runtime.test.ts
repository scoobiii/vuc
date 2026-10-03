import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
assert.equal(pkg.scripts["benchmark:livebench"], "node bin/livebench.js");
assert.equal(pkg.scripts["livebench"], "node bin/livebench.js");
assert.equal(pkg.bin.vuc, "./dist/vua.cjs");
assert.ok(fs.existsSync("bin/livebench.js"));
const source = fs.readFileSync(path.resolve("bin/livebench.js"),"utf8");
for (const token of ["2026-06-25","livebench.run_livebench","VUC_LIVEBENCH_API_BASE","VUC_LIVEBENCH_MODEL_PATH","Docker"]) {
  assert.ok(source.includes(token), `LiveBench runtime contract missing: ${token}`);
}
console.log("LiveBench 2026 runtime contract: PASS");
