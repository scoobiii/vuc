#!/usr/bin/env bash
set -euo pipefail

MODEL_PATH="$1"
LLAMA_SERVER="$2"
PORT="${3:-8080}"
OUT_DIR="${4:-$PWD}"
LOG="$OUT_DIR/llama-server.log"
RESPONSE="$OUT_DIR/response.json"

START_NS=$(date +%s%N)
"$LLAMA_SERVER" -m "$MODEL_PATH" --host 127.0.0.1 --port "$PORT" -c 4096 -t 4 -ngl 0 >"$LOG" 2>&1 &
PID=$!

cleanup() {
  kill "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 120); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "llama-server exited before health check" >&2
    tail -100 "$LOG" >&2 || true
    exit 1
  fi
  sleep 0.25
done

READY_NS=$(date +%s%N)
if [[ "$ready" != "1" ]]; then
  echo "llama-server health check timed out" >&2
  tail -100 "$LOG" >&2 || true
  exit 1
fi

cat >"$OUT_DIR/request.json" <<'JSON'
{"model":"micro-llm","messages":[{"role":"system","content":"Return exactly one JSON object. Do not use markdown fences or additional prose. You are an execution-proposal model; do not claim that you executed tools."},{"role":"user","content":"Return exactly one JSON object with keys action and capability. action must be inspect_repo and capability must be read."}],"temperature":0,"max_tokens":64,"stream":false,"response_format":{"type":"json_object"}}
JSON

REQ_START_NS=$(date +%s%N)
curl -fsS --max-time 120 "http://127.0.0.1:$PORT/v1/chat/completions"   -H 'Content-Type: application/json'   --data-binary @"$OUT_DIR/request.json" >"$RESPONSE"
REQ_END_NS=$(date +%s%N)

PROOF=FAIL
if [[ -n "${VUC_REPO_ROOT:-}" ]] && (cd "$VUC_REPO_ROOT" && npm run test:mcp-proof >"$OUT_DIR/vuc-proof.log" 2>&1); then
  PROOF=PASS
fi

node --input-type=module - "$MODEL_PATH" "$PID" "$START_NS" "$READY_NS" "$REQ_START_NS" "$REQ_END_NS" "$RESPONSE" "$PROOF" <<'NODE'
import fs from "node:fs";

const [modelPath,pid,startNs,readyNs,reqStartNs,reqEndNs,responsePath,proof] = process.argv.slice(2);
const body = JSON.parse(fs.readFileSync(responsePath, "utf8"));
const usage = body.usage ?? {};
const timings = body.timings ?? {};
let rssBytes = 0;

try {
  const status = fs.readFileSync("/proc/" + pid + "/status", "utf8");
  const m = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
  if (m) rssBytes = Number(m[1]) * 1024;
} catch {}

const output = body.choices?.[0]?.message?.content ?? "";
const tokensGenerated = Number(usage.completion_tokens ?? timings.predicted_n ?? 0);

if (!output || tokensGenerated <= 0) {
  console.error(JSON.stringify({
    status: "FAIL",
    reason: "no model output or completion tokens",
    response_path: responsePath
  }, null, 2));
  process.exit(2);
}

let outputValidJson = false;
try {
  JSON.parse(output);
  outputValidJson = true;
} catch {}

const evidence = {
  model_loaded: true,
  tokens_generated: tokensGenerated,
  prompt_tokens: Number(usage.prompt_tokens ?? timings.prompt_n ?? 0),
  startup_ms: (Number(readyNs) - Number(startNs)) / 1e6,
  latency_ms: (Number(reqEndNs) - Number(reqStartNs)) / 1e6,
  prompt_tokens_per_second: Number(timings.prompt_per_second ?? 0),
  generation_tokens_per_second: Number(timings.predicted_per_second ?? 0),
  rss_bytes: rssBytes,
  output_bytes: Buffer.byteLength(output),
  output_valid_json: outputValidJson,
  proof_verification: proof,
  proof_scope: "vuc-mcp-real-execution-path",
  runtime: "llama.cpp",
  execution_kind: "real_model_inference",
  model_path: modelPath
};

console.log(JSON.stringify(evidence, null, 2));
if (!outputValidJson || proof !== "PASS") process.exit(1);
NODE
