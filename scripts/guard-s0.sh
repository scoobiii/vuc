#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE_SHA:-origin/main}
if ! git diff --quiet "$BASE"...HEAD -- 'tests/s0-*' tests/.s0.sha256; then
  [ "${S0_CHANGE_APPROVED:-false}" = "true" ] || { echo "::error::S0 alterado sem aprovação"; exit 1; }
fi
if grep -nE '\.(skip|only|todo)\(|\bxit\(|\bxdescribe\(' tests/s0-*.test.ts; then
  echo "::error::S0 com skip/only/todo"; exit 1
fi
grep -q s0-llm-correctness tests/.s0.sha256 || { echo "::error::manifesto incompleto"; exit 1; }
sha256sum -c tests/.s0.sha256
