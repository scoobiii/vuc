#!/usr/bin/env bash
set -euo pipefail

echo "=== VUC PRE-FLIGHT ==="

fail=0

pass() {
  echo "PASS: $1"
}

fail_check() {
  echo "FAIL: $1"
  fail=1
}

echo "--- repository ---"
git status --short
git diff --check && pass "git diff --check" || fail_check "git diff --check"

echo "--- conflict markers ---"
if git grep -n -E '^(<<<<<<<|=======|>>>>>>>)( |$)' -- . ':!*.lock' >/tmp/vuc-conflicts.txt 2>/dev/null; then
  cat /tmp/vuc-conflicts.txt
  fail_check "unresolved merge conflict markers"
else
  pass "no unresolved merge conflict markers"
fi

echo "--- package ---"
node -e '
const fs=require("node:fs");
const p=JSON.parse(fs.readFileSync("package.json","utf8"));
if(!p.name || !p.version) throw new Error("package name/version missing");
if(!p.bin || typeof p.bin !== "object") throw new Error("package bin contract missing");
for(const [name,target] of Object.entries(p.bin)){
  if(!fs.existsSync(target)) throw new Error("bin contract broken: "+name+" -> "+target);
  console.log("PASS: bin "+name+" -> "+target);
}
'

echo "--- governance ---"
test -s .vortex/repository.json && pass ".vortex/repository.json present" || fail_check ".vortex/repository.json missing"

echo "--- hooks ---"
for f in .githooks/pre-push scripts/enable-internal-gate-hooks.sh; do
  if [ -x "$f" ]; then
    pass "$f executable"
  else
    fail_check "$f not executable"
  fi
done

echo "--- required workflows ---"
for f in .github/workflows/ci.yml .github/workflows/vortex-ci.yml; do
  if [ -s "$f" ]; then
    pass "$f present"
  else
    fail_check "$f missing"
  fi
done

echo "--- result ---"
if [ "$fail" -ne 0 ]; then
  echo "VUC PRE-FLIGHT: FAIL"
  exit 1
fi

echo "VUC PRE-FLIGHT: PASS"
