# Onboarding VUA/VUC — Developers & Agents

Este é o onboarding operacional único para **Developer** e **Agent**. Ele cobre runtime, dependências, Bend/DREX, GPU, VUA, MCP e ExecutionProof.

## 0. Pré-requisitos obrigatórios

- Node.js **>= 22.0.0**
- npm **>= 10.0.0**
- Termux GPU: shaderc + vulkan-loader
- Linux/Debian GPU: glslc + libvulkan-dev

```bash
node -v
npm -v
```

Se necessário: `nvm install 22 && nvm use 22` ou `fnm install 22 && fnm use 22`.

**Não rode `npm ci` com Node 20.**

## 1. Bootstrap do Developer

```bash
cd ~/vuc
npm ci --no-audit --no-fund
```

Se houve tentativa anterior com Node incompatível:

```bash
npm cache clean --force
rm -rf node_modules ~/.npm/_cacache/tmp
npm ci --no-audit --no-fund
```

**Não remova `package-lock.json` como rotina.**

## 2. Bend + DREX — obrigatório

```bash
export BEND_BIN="$PWD/bin/native/bin/bend"
chmod +x "$BEND_BIN"
test -x "$BEND_BIN"
"$BEND_BIN" version
test -f DREX_Laws.bend
```

Esperado: `bend 2.0.25`.

Sem `BEND_BIN`, Bend 2.0.25 ou `DREX_Laws.bend`, a trilha DREX está **NOT READY**.

## 3. GPU — gerar shader antes de testar

Termux:

```bash
pkg install shaderc vulkan-loader
./bin/native/gpu/shader/gen_spv_header.sh

c++ -std=c++17 -O2 -I$PREFIX/include \
  bin/native/gpu/vuc_gpu_compute.cpp \
  -L$PREFIX/lib -lvulkan \
  -o bin/native/gpu/vuc-gpu-compute

./bin/native/gpu/vuc-gpu-compute --warmup 20 --samples 100
```

Linux/Debian:

```bash
sudo apt install glslc libvulkan-dev
./bin/native/gpu/shader/gen_spv_header.sh
```

A evidência GPU precisa demonstrar execução real e resultado verificado. Fallback CPU não é execução GPU.

Depois:

```bash
npm run gpu:termux:probe
npm run test:termux-gpu-execution
```

## 4. Preflight e VUA

```bash
npm run preflight
npm run lint
npm run test:unit
npm run test:integration
npm run test:security
npm run build

npm run vua -- status
npm run vua -- adapters
npm run vua -- conformance
```

Se `tsc: not found` ou `tsx: not found`, o `npm ci` não terminou corretamente.

## 5. Servidor e MCP

```bash
npm run dev
curl -fsS http://localhost:3000/api/health
```

- HTTP: `POST /mcp`
- SSE: `GET /sse`
- stdio: `npm run vua -- mcp`

## 6. Onboarding do Agent

```text
Agent / LLM
    ↓ MCP
VUC
    ↓ Identity + Tenant + Capability + Policy
Connector
    ↓
REAL EXECUTION
    ↓
ExecutionProof
    ↓
Independent Verification
```

Ferramentas:

| Tool | Efeito | Uso |
|---|---:|---|
| `vortex.inspect` | false | inspeção |
| `vortex.propose` | false | proposta |
| `vortex.verify` | false | verificação |
| `vortex.execute` | true | execução autorizada |
| `vortex.branch.write` | true | escrita/merge autorizado |

**Agent Junior:** `inspect → understand → propose → verify`

**Agent Senior:** `inspect → capability/policy → propose → verify → execute [authorized] → verify ExecutionProof → branch.write [authorized] → CI → review → merge`

Junior/Senior são perfis operacionais, não modos nativos distintos do VUC.

## 7. ExecutionProof

Nunca confunda HTTP 200, log, texto de sucesso ou CI com prova criptográfica.

```bash
npm run test:mcp-proof
```

Caminho: `MCP → policy → connector → real execution → ExecutionProof → independent verification`.

## 8. K6

```bash
export BASE_URL=http://localhost:3000
npm run test:k6:smoke
npm run test:k6:load
npm run test:k6:stress
npm run test:k6:spike
npm run test:k6:soak
npm run test:k6:chaos
npm run test:k6:degradation
npm run test:k6:industry
```

Se `bin/k6` não existir, o fallback interno não é equivalente ao motor oficial K6.

## 9. Fluxo rápido

### Developer

```text
Node >=22 → npm ci → BEND_BIN/Bend 2.0.25 → DREX_Laws.bend
→ gen_spv_header.sh → GPU evidence → preflight
→ VUA conformance → dev/MCP
```

### Agent

```text
MCP → inspect → propose → verify → execute [authorized]
→ verify proof → branch.write [authorized] → CI → review → merge
```

> **Proof of execution is not proof of safety.**

---

## 10. Guias existentes

As seções históricas e específicas de prontidão externa, CLI, servidor HTTP, K6 e critérios de interpretação permanecem abaixo deste onboarding.
