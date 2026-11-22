#!/usr/bin/env bash
# Prova que o guard barra as adulterações, numa cópia descartável.
set -uo pipefail
R=$(git rev-parse --show-toplevel); T=$(mktemp -d); G=$(mktemp); OUT=$(mktemp); LST=$(mktemp)
trap 'rm -rf "$T" "$G" "$OUT" "$LST"' EXIT
git -C "$R" ls-files -co --exclude-standard -z > "$LST"
tar -C "$R" --null -T "$LST" -cf - 2>/dev/null | tar -xf - -C "$T" || true
cd "$T"
for f in tests/s0-trust-anchor.test.ts tests/s0-llm-correctness.test.ts tests/.s0.sha256 package.json scripts/guard-s0.sh; do
  [ -s "$f" ] || { echo "SETUP DO SELFTEST FALHOU: $f"; exit 2; }
done
git init -q; git config user.email t@t; git config user.name t
git add -A -f; git commit -qm base; BASE=$(git rev-parse HEAD)
git show "$BASE:scripts/guard-s0.sh" > "$G"
export CI=1; BAD=0; A=false; B=
run(){ BASE_SHA="${B:-$BASE}" S0_CHANGE_APPROVED="$A" bash "$G" pr >"$OUT" 2>&1; }
chk(){ local n=$1; shift; git reset -q --hard "$BASE"; git clean -fdq; eval "$*" >/dev/null 2>&1
  run; local rc=$?
  if [ $rc -eq 1 ]; then echo "✅ barrou: $n"
  elif [ $rc -eq 0 ]; then echo "❌ PASSOU (devia barrar): $n"; BAD=1
  else echo "❌ guard quebrou (rc=$rc): $n"; BAD=1; fi; }
S=tests/s0-llm-correctness.test.ts
m_pkg1(){ sed -i 's#\(test:s0": "[^"]*\)"#\1 || true"#' package.json; }
m_pkg2(){ sed -i 's#npm run test:s0 && ##' package.json; }
m_wf(){ sed -i 's#runs-on: ubuntu-latest#runs-on: ubuntu-latest\n    continue-on-error: true#' .github/workflows/s0-gate.yml; }
m_guard(){ sed -i 's#FAILED=1#FAILED=0#' scripts/guard-s0.sh; }
m_owners(){ sed -i '/s0/d' .github/CODEOWNERS; }

git reset -q --hard "$BASE"; run; rc=$?
if [ $rc -ne 0 ]; then echo "❌ controle limpo FALHOU (rc=$rc):"; cat "$OUT"; exit 1; fi
echo "✅ controle limpo passa"
chk "adulterar teste"            "echo '// x' >> $S"
chk "apagar teste"               "git rm -q $S"
chk "renomear teste"             "git mv $S tests/s0-llm-x.test.ts"
chk "teste+manifesto juntos"     "echo '// x' >> $S; sha256sum tests/s0-*.test.ts > tests/.s0.sha256"
chk "it.skip"                    "echo 'it.skip(1)' >> tests/s0-trust-anchor.test.ts"
chk "S0 novo fora do manifesto"  "cp tests/s0-trust-anchor.test.ts tests/s0-new.test.ts"
chk "remover manifesto"          "git rm -q tests/.s0.sha256"
chk "test:s0 com || true"        m_pkg1
chk "test:s0 fora do npm test"   m_pkg2
chk "workflow com atalho"        m_wf
chk "guard enfraquecido"         m_guard
chk "CODEOWNERS sem S0"          m_owners
A=true
chk "skip mesmo aprovado"        "echo 'it.skip(1)' >> tests/s0-trust-anchor.test.ts; sha256sum tests/s0-*.test.ts > tests/.s0.sha256"
chk "aprovado, manifesto velho"  "echo '// x' >> $S"
A=false; B=deadbeef
chk "base inválida"              "true"
echo; if [ $BAD -eq 0 ]; then echo "TUDO BARRADO ✅"; else echo "HÁ BRECHAS ❌"; exit 1; fi
