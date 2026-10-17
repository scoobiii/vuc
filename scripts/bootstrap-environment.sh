#!/usr/bin/env bash
set -euo pipefail

OUT="${VUC_BOOT_PROFILE:-${RUNNER_TEMP:-/tmp}/vuc-environment.json}"
mkdir -p "$(dirname "$OUT")"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
uid="$(id -u)"
user="$(id -un)"
node_version="$(node --version 2>/dev/null || true)"
npm_version="$(npm --version 2>/dev/null || true)"
git_version="$(git --version 2>/dev/null || true)"

ci_provider="local"
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  ci_provider="github-actions"
fi

is_container=false
if [ -f /run/.containerenv ] || [ -f /.dockerenv ] || grep -qaE '(docker|container|kubepods|podman)' /proc/1/cgroup 2>/dev/null; then
  is_container=true
fi

gpu=false
if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
  gpu=true
elif [ -d /dev/dri ]; then
  gpu=true
fi

network=false
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 5 https://registry.npmjs.org/ >/dev/null 2>&1; then
  network=true
fi

isolation="host"
[ "$is_container" = true ] && isolation="container"
[ "$ci_provider" = "github-actions" ] && isolation="ephemeral-vm"

privilege="user"
[ "$uid" -eq 0 ] && privilege="root"

runtime_supervision="user-process"
if [ "$ci_provider" = "github-actions" ]; then
  runtime_supervision="step-local"
elif [ "$is_container" = true ]; then
  runtime_supervision="container"
fi

fingerprint_input="$(printf '%s\n'   "schema=vuc-environment/v1"   "os=$os" "arch=$arch" "ci=$ci_provider" "isolation=$isolation"   "privilege=$privilege" "network=$network" "gpu=$gpu"   "runtime_supervision=$runtime_supervision" "node=$node_version" "npm=$npm_version")"
fingerprint="sha256:$(printf '%s' "$fingerprint_input" | sha256sum | awk '{print $1}')"

node - "$OUT" "$fingerprint" "$os" "$arch" "$ci_provider" "$isolation" "$privilege" "$network" "$gpu" "$runtime_supervision" "$node_version" "$npm_version" "$git_version" "$user" <<'NODE'
const fs = require('node:fs');
const [out, fingerprint, os, arch, ci, isolation, privilege, network, gpu, supervision, node, npm, git, user] = process.argv.slice(2);
const profile = {
  schema: 'vuc-environment/v1',
  detected_at: new Date().toISOString(),
  environment: ci === 'github-actions' ? 'github-actions' : os,
  os, arch, ci_provider: ci, isolation, privilege,
  network: network === 'true', gpu: gpu === 'true',
  runtime_supervision: supervision,
  user, node, npm, git,
  workspace: process.env.GITHUB_WORKSPACE || process.cwd(),
  temp: process.env.RUNNER_TEMP || '/tmp',
  fingerprint
};
fs.writeFileSync(out, JSON.stringify(profile, null, 2) + '\n', {mode: 0o600});
console.log(JSON.stringify(profile, null, 2));
NODE

test -s "$OUT"
grep -Fq '"schema": "vuc-environment/v1"' "$OUT"
grep -Fq '"fingerprint": "sha256:' "$OUT"
echo "VUC_BOOT=READY"
