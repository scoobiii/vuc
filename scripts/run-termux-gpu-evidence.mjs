import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("artifacts/gpu", { recursive: true });

const started = new Date().toISOString();

const output = execFileSync(
  "./bin/native/gpu/vuc-gpu-compute",
  { encoding: "utf8" }
);

const lines = Object.fromEntries(
  output
    .trim()
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    })
);

const evidence = {
  schema: "vuc-termux-gpu-execution/v1",
  timestamp: started,

  environment: {
    termux: true,
    platform: "android",
    arch: process.arch,
    node: process.version
  },

  gpu: {
    device: lines.device ?? null,
    driver_version: lines.driver ?? null
  },

  execution: {
    backend: "Vulkan",
    api: "Vulkan Compute",
    dispatch_workgroups: Number(lines.dispatch_workgroups ?? 0),
    elements: Number(lines.elements ?? 0),
    status: lines.gpu_execution ?? "UNKNOWN",
    result_verified: lines.result_verified === "true"
  },

  provenance: {
    capability: "OBSERVED",
    execution: lines.gpu_execution === "EXECUTED" ? "OBSERVED" : "UNVERIFIED",
    result: lines.result_verified === "true" ? "VERIFIED" : "UNVERIFIED"
  }
};

writeFileSync(
  "artifacts/gpu/vuc-termux-gpu-execution.json",
  JSON.stringify(evidence, null, 2) + "\n"
);

console.log(JSON.stringify(evidence, null, 2));

if (
  evidence.execution.status !== "EXECUTED" ||
  !evidence.execution.result_verified
) {
  process.exit(2);
}
