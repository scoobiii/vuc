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
  echo "✔ Compilador bend encontrado no PATH do sistema: ${SYSTEM_BEND}"
  bend version || true
fi

# 2. Se já estiver instalado no bin/native, testa execução
if [ -f "${TARGET_BIN}" ] && [ -x "${TARGET_BIN}" ]; then
  echo "✔ Binário local já presente em ${TARGET_BIN}"
  "${TARGET_BIN}" version || true
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

TAR_NAME="bend-2.0.25-${PLATFORM_OS}-${PLATFORM_ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/bendlang/bend/releases/download/v2.0.25/${TAR_NAME}"
TMP_TAR="/tmp/${TAR_NAME}"

echo "⬇ Baixando Bend 2.0.25 para ${PLATFORM_OS}-${PLATFORM_ARCH}..."
echo "  URL: ${DOWNLOAD_URL}"

curl -fsSL -o "${TMP_TAR}" "${DOWNLOAD_URL}"

echo "📦 Extraindo em ${BIN_DIR}..."
mkdir -p "${BIN_DIR}"
tar -xzf "${TMP_TAR}" -C "${BIN_DIR}" --strip-components=1
rm -f "${TMP_TAR}"

chmod +x "${TARGET_BIN}"

echo "✔ Bend 2.0.25 instalado com sucesso!"
"${TARGET_BIN}" version
