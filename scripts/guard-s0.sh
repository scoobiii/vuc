#!/usr/bin/env bash
# guard-s0.sh [pr|verify] — protege o S0. Falha fechado: na dúvida, reprova.
set -Eeuo pipefail
trap 'echo "::error::S0-GUARD abortou na linha $LINENO (falha fechada)"; exit 2' ERR
MODE=${1:-pr}; APPROVED=${S0_CHANGE_APPROVED:-false}; FAILED=0
fail(){ echo "::error::S0-GUARD: $*"; FAILED=1; }
die(){ echo "::error::S0-GUARD: $*"; exit 1; }
git rev-parse --show-toplevel >/dev/null 2>&1 || die "fora de um repo git"
cd "$(git rev-parse --show-toplevel)"
[[ $MODE == pr || $MODE == verify ]] || die "modo invalido: $MODE"
[[ "$(git rev-parse --is-shallow-repository)" == false ]] || die "clone raso (use fetch-depth: 0)"
TMPD=$(mktemp -d); trap 'rm -rf "$TMPD"' EXIT

PROT=('tests/s0-*' tests/.s0.sha256 scripts/guard-s0.sh .github/workflows/s0-gate.yml .github/CODEOWNERS)
{ git ls-files 'tests/s0-*.test.ts'; git ls-files -o --exclude-standard 'tests/s0-*.test.ts'; } | sort -u > "$TMPD/s0"
mapfile -t S0 < "$TMPD/s0"
for f in tests/s0-trust-anchor.test.ts tests/s0-llm-correctness.test.ts; do
  [[ -s $f ]] || die "$f ausente ou vazio"
done
[[ -s tests/.s0.sha256 ]] || die "manifesto tests/.s0.sha256 ausente"

# 1. manifesto cobre exatamente os S0 e os hashes batem
awk '{print $2}' tests/.s0.sha256 | sort -u > "$TMPD/m"
diff "$TMPD/s0" "$TMPD/m" >/dev/null || fail "manifesto não cobre exatamente os testes S0"
sha256sum -c --strict tests/.s0.sha256 >/dev/null || fail "hash do S0 diverge do manifesto"

# 2. sem enfraquecimento (vale mesmo com aprovação)
if grep -nE '\.(skip|only|todo)\(|\b(xit|xdescribe|xtest)\(|@ts-nocheck' "${S0[@]}"; then
  fail "S0 com skip/only/todo/xit/ts-nocheck"
fi

# 3. test:s0 roda os dois testes, sem atalhos, e está no npm test
node -e '
const s=require("./package.json").scripts||{}, t=s["test:s0"]||"", bad=[];
for (const f of ["tests/s0-trust-anchor.test.ts","tests/s0-llm-correctness.test.ts"]) if(!t.includes(f)) bad.push("test:s0 não executa "+f);
if (/\|\||;|\btrue\b|exit 0|--passWithNoTests/.test(t)) bad.push("test:s0 com atalho");
if (!/npm run test:s0\b/.test(s.test||"")) bad.push("npm test não inclui test:s0");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
' || fail "package.json enfraqueceu o test:s0"

# 4. workflow e CODEOWNERS intactos
W=.github/workflows/s0-gate.yml
if [[ -f $W ]]; then
  if grep -nE 'continue-on-error|\|\|\s*true|if:\s*false|paths-ignore|branches-ignore' "$W"; then fail "workflow S0 com atalho/skip"; fi
  if grep -q 'npm run test:s0' "$W" && grep -q 's0-required' "$W"; then :; else fail "workflow sem test:s0 ou s0-required"; fi
else
  fail "$W ausente"
fi
for p in '^/tests/s0-\*' '^/tests/\.s0\.sha256' '^/scripts/guard-s0\.sh'; do
  grep -qE "$p" .github/CODEOWNERS 2>/dev/null || fail "CODEOWNERS sem regra $p"
done

# 5. (pr) protegidos só mudam com aprovação
BASE_USED=n/a
if [[ $MODE == pr ]]; then
  if [[ -z ${CI:-} ]]; then git fetch -q origin main 2>/dev/null || echo "::warning::fetch falhou; usando origin/main local"; fi
  BASE=${BASE_SHA:-}
  if [[ -z $BASE || $BASE =~ ^0+$ ]]; then BASE=origin/main; fi
  MB=$(git merge-base "$BASE" HEAD 2>/dev/null) || die "sem base comum com '$BASE' (base inválida?)"
  BASE_USED=$MB
  CH=$({ git diff --name-status "$MB" -- "${PROT[@]}"; git ls-files -o --exclude-standard -- "${PROT[@]}" | sed 's/^/A\t/'; })
  if [[ -n $CH ]]; then
    if [[ $APPROVED == true ]]; then echo "::warning::protegidos alterados COM aprovação:"; echo "$CH"
    else fail "protegidos alterados sem aprovação:"; echo "$CH"; fi
  fi
fi
[[ $FAILED -eq 0 ]] || exit 1
echo "S0-GUARD OK (modo=$MODE base=$BASE_USED aprovado=$APPROVED)"
