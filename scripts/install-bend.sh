#!/usr/bin/env bash
set -e

# ==============================================================================
# VUA - Script de Instalação do Compilador Nativo Bend (Bend 2.0.25)
# Permite verificação formal mecânica no DREX e HVM (Hardware Virtual Machine)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${ROOT_DIR}/bin/native"
TARGET_BIN="${BIN_DIR}/bin/bend"

echo "=== [VUA] Verificando / Instalando Compilador Nativo Bend ==="

# 1. Se já existir no sistema local via PATH, verifica versão
if command -v bend >/dev/null 2>&1; then
  SYSTEM_BEND="$(command -v bend)"
  echo "ℹ Bend encontrado no PATH do sistema: ${SYSTEM_BEND}"
  bend version || true
  echo "ℹ O PATH do sistema não substitui o Bend 2.0.25 pinado do VUC."
fi

# 2. Se já estiver instalado no bin/native, testa execução
if [ -f "${TARGET_BIN}" ] && [ -x "${TARGET_BIN}" ]; then
  echo "✔ Binário local presente em ${TARGET_BIN}"
  if ! "${TARGET_BIN}" version 2>&1 | grep -q "2.0.25"; then
    echo "❌ Binário local não é Bend 2.0.25; recusando uso."
    exit 1
  fi
  "${TARGET_BIN}" version
  exit 0
fi

# 3. Detecta Sistema Operacional e Arquitetura
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "${OS}" in
  linux*)
    PLATFORM_OS="linux"
    ;;
  darwin*)
    PLATFORM_OS="darwin"
    ;;
  *)
    echo "❌ Sistema operacional não suportado automaticamente: ${OS}"
    echo "Consulte https://bendlang.com para instalação manual."
    exit 1
    ;;
esac

case "${ARCH}" in
  x86_64|amd64)
    PLATFORM_ARCH="x64"
    ;;
  aarch64|arm64)
    PLATFORM_ARCH="arm64"
    ;;
  *)
    echo "❌ Arquitetura não suportada automaticamente: ${ARCH}"
    echo "Consulte https://bendlang.com para instalação manual."
    exit 1
    ;;
esac


case "${PLATFORM_OS}-${PLATFORM_ARCH}" in
  linux-arm64) EXPECTED_TARBALL_SHA256="c7cce7508fd13201d544180cca531a87a89c41829876c431cdfa0ea7f5308481" ;;
  linux-x64) EXPECTED_TARBALL_SHA256="91c0e2640f8d2e3e73fd3dd62ed4d178ce9a6f7ce8f8980b4dc4abf7a6f9ccd4" ;;
  darwin-arm64) EXPECTED_TARBALL_SHA256="c5bb22ba029d5909da9c6db82aa037278a66d1cf8a5572f433879f7dcd866c31" ;;
  darwin-x64) EXPECTED_TARBALL_SHA256="78e70cda4068f83736649c760575f4382259d5817be96d2eb04b9d078d943af0" ;;
  *) echo "Plataforma sem SHA-256 allowlist."; exit 1 ;;
esac

TAR_NAME="bend-2.0.25-${PLATFORM_OS}-${PLATFORM_ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/bendlang/bend/releases/download/v2.0.25/${TAR_NAME}"
TMP_TAR="/tmp/${TAR_NAME}"

echo "⬇ Baixando Bend 2.0.25 para ${PLATFORM_OS}-${PLATFORM_ARCH}..."
echo "  URL: ${DOWNLOAD_URL}"

# GitHub release assets can transiently return HTTP 5xx from the edge.
# Retry the exact pinned asset; never fall back to an unpinned installer.
curl --fail --silent --show-error --location \
  --retry 5 --retry-delay 3 --retry-all-errors \
  --connect-timeout 15 --max-time 120 \
  -o "${TMP_TAR}" "${DOWNLOAD_URL}"
ACTUAL_TARBALL_SHA256="$(sha256sum "${TMP_TAR}" | cut -d " " -f1)"
if [ "${ACTUAL_TARBALL_SHA256}" != "${EXPECTED_TARBALL_SHA256}" ]; then echo "SHA-256 Bend rejeitado"; exit 1; fi

echo "📦 Extraindo em ${BIN_DIR}..."
mkdir -p "${BIN_DIR}"
tar -xzf "${TMP_TAR}" -C "${BIN_DIR}" --strip-components=1
rm -f "${TMP_TAR}"

chmod +x "${TARGET_BIN}"
ACTUAL_BIN_SHA256="$(sha256sum "${TARGET_BIN}" | cut -d " " -f1)"
echo "SHA-256 binário: ${ACTUAL_BIN_SHA256}"

if ! "${TARGET_BIN}" version 2>&1 | grep -q "2.0.25"; then
  echo "❌ Binário baixado não reporta Bend 2.0.25; instalação recusada."
  exit 1
fi

echo "✔ Bend 2.0.25 instalado com sucesso!"
"${TARGET_BIN}" version
