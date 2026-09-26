import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evidence = JSON.parse(
  readFileSync(
    "artifacts/gpu/vuc-termux-gpu-execution.json",
    "utf8"
  )
);

assert.equal(
  evidence.schema,
  "vuc-termux-gpu-execution/v1"
);

assert.equal(
  evidence.execution.backend,
  "Vulkan"
);

assert.equal(
  evidence.execution.status,
  "EXECUTED"
);

assert.equal(
  evidence.execution.result_verified,
  true
);

assert.ok(
  evidence.execution.elements > 0
);

console.log("PASS: VUC Termux GPU execution evidence");
