#!/usr/bin/env bash
# VUC commercial release preparation — 1.0.3
# Safe by default: checks only. --stage runs CI/build checks and stages assets in site/.
# This script NEVER publishes to npm, creates/pushes tags, changes Pages settings,
# commits files, or deploys GitHub Pages.
set -Eeuo pipefail

readonly EXPECTED_VERSION="1.0.3"
readonly PACKAGE_NAME="@vucfoundation/vuc"
readonly REPOSITORY="scoobiii/vuc"
readonly PAGES_URL="https://scoobiii.github.io/vuc/"
readonly NPM_VERSION_URL="https://registry.npmjs.org/%40vucfoundation%2fvuc/${EXPECTED_VERSION}"
readonly GITHUB_RELEASE_URL="https://api.github.com/repos/${REPOSITORY}/releases/tags/v${EXPECTED_VERSION}"

MODE="check"
case "${1:---check}" in
  --check) MODE="check" ;;
  --stage) MODE="stage" ;;
  --help|-h)
    cat <<'HELP'
VUC commercial release preparation for v1.0.3

Usage:
  bash scripts/prepare-commercial-release.sh [--check|--stage]

  --check  Read-only launch preflight (default); reports blockers.
  --stage  Requires a passing preflight, runs CI/build/package checks, then
           stages the CLI, server bundle, npm tarball, checksums and release.json
           beneath site/downloads/v1.0.3 for a later Pages workflow upload.

No mode publishes to npm, creates/pushes a Git tag, changes Pages settings,
commits changes, or deploys the site.
HELP
    exit 0
    ;;
  *)
    echo "Usage: $0 [--check|--stage]" >&2
    exit 2
    ;;
esac

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "BLOCKER: execute this script from inside a VUC Git checkout." >&2
  exit 2
fi
cd "$ROOT"

PASS_COUNT=0
BLOCKER_COUNT=0
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass() { printf 'PASS: %s\n' "$1"; PASS_COUNT=$((PASS_COUNT + 1)); }
blocker() { printf 'BLOCKER: %s\n' "$1"; BLOCKER_COUNT=$((BLOCKER_COUNT + 1)); }
info() { printf '\n-- %s --\n' "$1"; }

printf 'VUC commercial release preflight — v%s (%s mode)\n' "$EXPECTED_VERSION" "$MODE"
printf 'Repository: %s\n' "$ROOT"

info "Ferramentas e identidade do repositório"
for tool in git node npm curl sha256sum; do
  if command -v "$tool" >/dev/null 2>&1; then pass "$tool disponível"; else blocker "ferramenta ausente: $tool"; fi
done
REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE_URL" == *"github.com/${REPOSITORY}"* || "$REMOTE_URL" == *"github.com:${REPOSITORY}"* ]]; then
  pass "origin aponta para ${REPOSITORY}"
else
  blocker "origin não corresponde a ${REPOSITORY} (valor atual: ${REMOTE_URL:-ausente})"
fi
BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ "$BRANCH" == "main" ]]; then pass "branch main"; else blocker "release deve partir de main; branch atual: ${BRANCH:-detached}"; fi
if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
  pass "working tree limpo"
else
  blocker "working tree contém alterações; revise e commit/reverta antes do preflight final"
  git status --short
fi
if git fetch --quiet origin main; then
  HEAD_SHA="$(git rev-parse HEAD)"
  REMOTE_MAIN_SHA="$(git rev-parse origin/main)"
  if [[ "$HEAD_SHA" == "$REMOTE_MAIN_SHA" ]]; then pass "HEAD coincide com origin/main (${HEAD_SHA:0:12})"; else blocker "HEAD não é o main atual; local=${HEAD_SHA:0:12}, origin/main=${REMOTE_MAIN_SHA:0:12}"; fi
else
  blocker "não foi possível atualizar origin/main; estado remoto não verificável"
fi

info "Contrato de versão e pacote"
if [[ -s package.json && -s package-lock.json ]]; then
  if node - "$EXPECTED_VERSION" <<'NODE'
const fs = require('node:fs');
const expected = process.argv[2];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const errors = [];
if (pkg.name !== '@vucfoundation/vuc') errors.push(`package.json name=${pkg.name}; esperado @vucfoundation/vuc`);
if (pkg.version !== expected) errors.push(`package.json version=${pkg.version}; esperado ${expected}`);
if (lock.name !== '@vucfoundation/vuc') errors.push(`package-lock.json name=${lock.name}; esperado @vucfoundation/vuc`);
if (lock.version !== expected) errors.push(`package-lock.json version=${lock.version}; esperado ${expected}`);
if (lock.packages?.['']?.version !== expected) errors.push(`package-lock.json packages[""].version=${lock.packages?.['']?.version}; esperado ${expected}`);
if (lock.lockfileVersion !== 3) errors.push(`lockfileVersion=${lock.lockfileVersion}; esperado 3`);
for (const key of ['lint', 'verify:gos3', 'test:ci', 'build', 'build:cli']) {
  if (!pkg.scripts?.[key]) errors.push(`script npm ausente: ${key}`);
}
if (errors.length) { console.error(errors.map(x => `- ${x}`).join('\n')); process.exit(1); }
console.log(`package/lock contract: ${pkg.name}@${expected}, lockfile v3`);
NODE
  then pass "package.json e package-lock.json consistentes em ${PACKAGE_NAME}@${EXPECTED_VERSION}";
  else blocker "contrato de versão do pacote não está pronto para ${EXPECTED_VERSION}"; fi
else
  blocker "package.json ou package-lock.json ausente"
fi

# Current CI has explicit 1.0.2 assertions; require the release branch to update them.
if grep -R -nE '(lock\.version|p\.version)[^\n]{0,120}1\.0\.2' .github/workflows 2>/dev/null >"$TMP_DIR/version-pins"; then
  blocker "workflows ainda fixam a versão 1.0.2; atualize os contratos CI/ARM64 para ${EXPECTED_VERSION}"
  cat "$TMP_DIR/version-pins"
else
  pass "nenhuma asserção de versão CI mantém o pin 1.0.2"
fi
if [[ -s docs/CI-STATUS.md ]] && grep -Fq "${PACKAGE_NAME}@${EXPECTED_VERSION}" docs/CI-STATUS.md; then
  pass "docs/CI-STATUS.md aponta para ${PACKAGE_NAME}@${EXPECTED_VERSION}"
else
  blocker "docs/CI-STATUS.md ainda não documenta ${PACKAGE_NAME}@${EXPECTED_VERSION}"
fi

info "Documentação, site e artefatos dinâmicos"
for f in site/index.html site/data/runner.json docs/README.md docs/SECURITY.md docs/EVIDENCE.md; do
  if [[ -s "$f" ]]; then pass "$f presente"; else blocker "$f ausente ou vazio"; fi
done
if node - <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('site/data/runner.json', 'utf8'));
if (data.schema !== 'vuc.ci-runner-telemetry.v1') process.exit(1);
NODE
then pass "manifesto de telemetria usa schema CI suportado"; else blocker "site/data/runner.json não respeita o schema de telemetria"; fi
if grep -q 'data/release.json' site/index.html; then
  pass "frontend contém consumidor do manifesto dinâmico de release"
else
  blocker "site/index.html ainda não renderiza site/data/release.json/links dos entregáveis"
fi
if grep -R -q 'name: vuc-release-assets' .github/workflows/ci.yml 2>/dev/null && grep -q 'vuc-release-assets' .github/workflows/pages.yml 2>/dev/null; then
  pass "CI publica e Pages consome o artefato vuc-release-assets"
else
  blocker "integração binários CI → Pages ainda não está configurada com vuc-release-assets nos dois workflows"
fi

info "GitHub Pages publicado"
if command -v gh >/dev/null 2>&1; then
  PAGES_BUILD_TYPE="$(gh api "repos/${REPOSITORY}/pages" --jq '.build_type' 2>/dev/null || true)"
  if [[ "$PAGES_BUILD_TYPE" == "workflow" ]]; then pass "GitHub Pages usa GitHub Actions"; else blocker "GitHub Pages build_type=${PAGES_BUILD_TYPE:-indisponível}; configure a publicação por GitHub Actions (o estado observado é legacy /docs)"; fi
else
  blocker "gh CLI necessário para verificar a configuração efetiva do GitHub Pages"
fi
if [[ -s site/index.html ]]; then
  LIVE_CODE="$(curl -L -sS --max-time 20 -o "$TMP_DIR/pages.html" -w '%{http_code}' "$PAGES_URL" 2>/dev/null || true)"
  if [[ "$LIVE_CODE" == "200" ]] && grep -q 'id="ci-status"' "$TMP_DIR/pages.html"; then
    pass "raiz publicada entrega o landing page dinâmico em ${PAGES_URL}"
  elif [[ "$LIVE_CODE" == "200" ]]; then
    blocker "${PAGES_URL} responde 200, mas não entrega site/index.html (conteúdo da raiz está divergente)"
  else
    blocker "raiz do GitHub Pages indisponível ou HTTP ${LIVE_CODE:-sem resposta}: ${PAGES_URL}"
  fi
fi

info "Disponibilidade do identificador v1.0.3"
if git ls-remote --tags origin "refs/tags/v${EXPECTED_VERSION}" "refs/tags/v${EXPECTED_VERSION}^{}" 2>/dev/null | grep -q .; then
  blocker "tag remota v${EXPECTED_VERSION} já existe; não sobrescreva um identificador de release"
else
  pass "tag v${EXPECTED_VERSION} ainda não existe no origin"
fi
NPM_CODE="$(curl -sS -L --max-time 20 -o "$TMP_DIR/npm.json" -w '%{http_code}' "$NPM_VERSION_URL" 2>/dev/null || true)"
case "$NPM_CODE" in
  404) pass "${PACKAGE_NAME}@${EXPECTED_VERSION} ainda não está publicado no npm" ;;
  200) blocker "${PACKAGE_NAME}@${EXPECTED_VERSION} já está publicado; publicação não será repetida" ;;
  *) blocker "não foi possível verificar o npm registry (HTTP ${NPM_CODE:-sem resposta})" ;;
esac
GH_RELEASE_CODE="$(curl -sS -L --max-time 20 -o "$TMP_DIR/release.json" -w '%{http_code}' "$GITHUB_RELEASE_URL" 2>/dev/null || true)"
case "$GH_RELEASE_CODE" in
  404) pass "GitHub Release v${EXPECTED_VERSION} ainda não existe" ;;
  200) blocker "GitHub Release v${EXPECTED_VERSION} já existe; reconcilie-o em vez de recriá-lo" ;;
  *) blocker "não foi possível verificar o GitHub Release (HTTP ${GH_RELEASE_CODE:-sem resposta})" ;;
esac

info "Resumo"
printf 'PASS: %s\n' "$PASS_COUNT"
printf 'BLOCKER: %s\n' "$BLOCKER_COUNT"
if (( BLOCKER_COUNT > 0 )); then
  echo "RELEASE PREPARATION: BLOCKED — nenhum tag, publish ou deploy foi iniciado."
  exit 1
fi

echo "RELEASE PREPARATION: PREFLIGHT PASS — ainda não significa autorização para publicar."

if [[ "$MODE" == "stage" ]]; then
  echo
  echo "Executando CI e build de preparação (sem publicar/deploy)..."
  npm ci --no-audit --no-fund
  npm run install:bend
  npm run lint
  npm run verify:gos3
  CI=true VUC_SANDBOX=strict npm run test:ci
  npm run build
  npm run build:cli

  test -s dist/vua.cjs
  test -s dist/server.cjs
  node dist/vua.cjs --help >"$TMP_DIR/vuc-help.txt"
  grep -Eiq 'VUC|VUA' "$TMP_DIR/vuc-help.txt"
  node dist/vua.cjs status
  node dist/vua.cjs conformance

  npm pack --dry-run --json >"$TMP_DIR/npm-pack.json"
  node - "$TMP_DIR/npm-pack.json" <<'NODE'
const fs = require('node:fs');
const f = process.argv[2];
const pack = JSON.parse(fs.readFileSync(f, 'utf8'))[0];
const files = new Set((pack?.files ?? []).map(x => x.path));
for (const file of ['dist/vua.cjs', 'dist/server.cjs', 'package.json']) {
  if (!files.has(file)) throw new Error(`npm pack missing ${file}`);
}
console.log('PASS: npm package includes CLI, server bundle and package metadata');
NODE

  STAGE_DIR="site/downloads/v${EXPECTED_VERSION}"
  if [[ -e "$STAGE_DIR" ]]; then
    blocker "$STAGE_DIR já existe; não sobrescrevendo arquivos de release"
    exit 1
  fi
  mkdir -p "$STAGE_DIR"
  install -m 0755 dist/vua.cjs "$STAGE_DIR/vuc-cli.cjs"
  install -m 0644 dist/server.cjs "$STAGE_DIR/vuc-server.cjs"
  npm pack --pack-destination "$STAGE_DIR" >/dev/null
  sha256sum "$STAGE_DIR/vuc-cli.cjs" "$STAGE_DIR/vuc-server.cjs" "$STAGE_DIR"/*.tgz > "$STAGE_DIR/SHA256SUMS"

  node - "$STAGE_DIR" "$EXPECTED_VERSION" "$PACKAGE_NAME" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [dir, version, packageName] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f !== 'release.json' && f !== 'SHA256SUMS').sort();
const assets = files.map(file => {
  const full = path.join(dir, file);
  const bytes = fs.readFileSync(full);
  return {
    name: file,
    href: `./downloads/v${version}/${encodeURIComponent(file)}`,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
});
const manifest = {
  schema: 'vuc.pages.release.v1',
  package: packageName,
  version,
  tag: `v${version}`,
  sourceCommit: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  status: 'prepared-not-published',
  generatedAt: new Date().toISOString(),
  assets,
};
fs.mkdirSync('site/data', { recursive: true });
fs.writeFileSync('site/data/release.json', JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(`Prepared ${assets.length} release assets in ${dir}`);
NODE

  echo
  echo "STAGED: $STAGE_DIR"
  echo "MANIFEST: site/data/release.json"
  echo "NEXT: CI must upload vuc-release-assets and Pages must download that artifact before deploy."
  echo "No tag, npm publish, GitHub Release, commit, or Pages deployment was performed."
fi
