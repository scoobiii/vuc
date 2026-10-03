#!/usr/bin/env bash
set -euo pipefail
CACHE_ROOT="$HOME/.cache/vuc/livebench-runtime"
CACHE_OVERRIDE="$(printenv VUC_LIVEBENCH_CACHE || true)"
if [ -n "$CACHE_OVERRIDE" ]; then CACHE_ROOT="$CACHE_OVERRIDE"; fi
BIN_DIR="$CACHE_ROOT/bin"
LLAMA_REF="$(printenv VUC_LLAMA_CPP_REF || true)"; [ -n "$LLAMA_REF" ] || LLAMA_REF="b10488"
LLAMA_DIR="$CACHE_ROOT/llama.cpp-$LLAMA_REF"
mkdir -p "$BIN_DIR" "$CACHE_ROOT"
log(){ printf '[VUC-LB-BOOTSTRAP] %s\n' "$*"; }
die(){ printf '[VUC-LB-BOOTSTRAP] FAIL: %s\n' "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }
apt_install(){ have apt-get || return 1; [ "$(id -u)" = 0 ] || return 1; export DEBIAN_FRONTEND=noninteractive; apt-get update -y; apt-get install -y --no-install-recommends "$@"; }

if ! have python3; then
  log "Installing Python 3 + venv"
  apt_install python3 python3-venv python3-pip || die "cannot provision Python 3"
fi
python3 - <<'PY'
import sys
if sys.version_info < (3,10): raise SystemExit("Python >=3.10 required")
print("Python:", sys.version.split()[0])
PY

if ! have docker; then
  log "Installing Docker"
  apt_install docker.io || { have curl && [ "$(id -u)" = 0 ] && curl -fsSL https://get.docker.com | sh || true; }
fi
if have docker && [ "$(id -u)" = 0 ] && command -v systemctl >/dev/null 2>&1; then systemctl enable --now docker || true; fi
docker info >/dev/null 2>&1 || log "Docker daemon unavailable; full Agentic Coding gate will remain fail-closed"

if ! have llama-server && [ ! -x "$BIN_DIR/llama-server" ]; then
  if have apt-get && [ "$(id -u)" = 0 ]; then
    apt-get update -y >/dev/null 2>&1 || true
    apt-get install -y --no-install-recommends llama.cpp-tools >/dev/null 2>&1 || true
  fi
fi
if ! have llama-server && [ ! -x "$BIN_DIR/llama-server" ]; then
  have git || apt_install git || die "git unavailable"
  have cmake || apt_install cmake || die "cmake unavailable"
  have g++ || apt_install build-essential || die "C++ compiler unavailable"
  if [ ! -d "$LLAMA_DIR/.git" ]; then
    log "Building llama.cpp $LLAMA_REF"
    git clone --depth 1 --branch "$LLAMA_REF" https://github.com/ggml-org/llama.cpp.git "$LLAMA_DIR"
  fi
  cmake -S "$LLAMA_DIR" -B "$LLAMA_DIR/build" -DCMAKE_BUILD_TYPE=Release -DLLAMA_BUILD_SERVER=ON -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=ON -DLLAMA_BUILD_TOOLS=ON
  cmake --build "$LLAMA_DIR/build" --config Release --target llama-server --parallel 2
  cp "$LLAMA_DIR/build/bin/llama-server" "$BIN_DIR/llama-server"
  chmod +x "$BIN_DIR/llama-server"
fi
LLAMA="$(command -v llama-server || echo "$BIN_DIR/llama-server")"
[ -x "$LLAMA" ] || die "llama-server unavailable"

DEVICE="$(printenv VUC_LIVEBENCH_DEVICE || true)"; [ -n "$DEVICE" ] || DEVICE="auto"
"$LLAMA" --list-devices >/tmp/vuc-llama-devices.txt 2>&1 || true
GPU="false"
grep -Eiq 'vulkan|cuda|metal|opencl|sycl|gpu|adreno|qualcomm|rocm' /tmp/vuc-llama-devices.txt && GPU="true" || true
case "$DEVICE" in
  auto) [ "$GPU" = true ] && DEVICE="gpu" || DEVICE="cpu" ;;
  gpu) [ "$GPU" = true ] || die "GPU requested but no verified llama.cpp GPU backend is exposed" ;;
  cpu) ;;
  *) die "VUC_LIVEBENCH_DEVICE must be auto, cpu or gpu" ;;
esac
GPU_LAYERS=0; [ "$DEVICE" = gpu ] && GPU_LAYERS=999

MODEL="$(printenv VUC_LIVEBENCH_MODEL_PATH || true)"
[ -n "$MODEL" ] || MODEL="$CACHE_ROOT/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf"
if [ ! -s "$MODEL" ]; then
  have curl || apt_install curl || die "curl unavailable"
  URL="$(printenv VUC_LIVEBENCH_MODEL_URL || true)"
  [ -n "$URL" ] || URL="https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf?download=true"
  log "Downloading Qwen2.5-Coder-0.5B-Instruct Q4_K_M"
  curl -fL --retry 5 --retry-delay 2 "$URL" -o "$MODEL"
fi
SHA="$(sha256sum "$MODEL" | awk '{print $1}')"
EXPECTED="$(printenv VUC_LIVEBENCH_MODEL_SHA256 || true)"
[ -n "$EXPECTED" ] || EXPECTED="1d9614638d18024d0fbb36575a15f1302a3adf044df10345688ec4f6e1c4ff32"
[ "$SHA" = "$EXPECTED" ] || die "model SHA-256 mismatch: got $SHA expected $EXPECTED"

cat > "$CACHE_ROOT/runtime.env" <<EOF
VUC_LIVEBENCH_MODEL_PATH=$MODEL
VUC_LIVEBENCH_LLAMA_SERVER=$LLAMA
VUC_LIVEBENCH_DEVICE=$DEVICE
VUC_LIVEBENCH_GPU_LAYERS=$GPU_LAYERS
VUC_LIVEBENCH_MODEL_SHA256=$SHA
VUC_LIVEBENCH_LLAMA_REF=$LLAMA_REF
EOF
cat > "$CACHE_ROOT/runtime-manifest.json" <<EOF
{"schema":"vuc-livebench-runtime/v2","release":"2026-06-25","arch":"$(uname -m)","python":"$(python3 --version)","docker":"$(docker --version 2>&1 || echo unavailable)","docker_daemon":"$(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo unavailable)","llama_server":"$($LLAMA --version 2>&1 | head -n 1)","llama_ref":"$LLAMA_REF","device":"$DEVICE","gpu_layers":$GPU_LAYERS,"model_path":"$MODEL","model_sha256":"$SHA"}
EOF
cat "$CACHE_ROOT/runtime.env"
cat "$CACHE_ROOT/runtime-manifest.json"
