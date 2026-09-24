# 01. Visão geral, instalação e onboarding CLI/MCP

O VUA/VUC combina um runtime de governança, um CLI `vua`, adaptadores, verificação criptográfica de `ExecutionProof`, servidor MCP e uma interface web. Este guia separa explicitamente o uso no checkout, o CLI empacotado e os dois transportes MCP disponíveis.

## 1. Pré-requisitos e instalação

Use Node.js 22 e npm. No checkout, prefira a instalação reproduzível:

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
```

O pacote declara o nome `@vortexfoundation/vua` e o binário `vua`, mas os comandos `npx @vortexfoundation/vua ...` e `npm install -g @vortexfoundation/vua` só funcionam depois de publicação efetiva no registry. Para desenvolvimento no checkout, use `npm run vua -- ...`.

## 2. CLI no checkout

O CLI de desenvolvimento usa `tsx` para carregar os módulos TypeScript do repositório. Por isso, este é o fluxo suportado:

```bash
npm run vua -- status
npm run vua -- adapters
npm run vua -- bench
npm run vua -- verify proof.json
```

Não documentamos `npm link` seguido de `vua status` como fluxo de desenvolvimento: o `bin/vua.js` importa módulos `.js`, enquanto o checkout contém os fontes `.ts` e não gera automaticamente um bundle independente do CLI.

## 3. Comandos disponíveis

| Comando | Descrição | Exemplo no checkout |
|---|---|---|
| `status` | Diagnóstico de hardware, memória, arquitetura e identidade | `npm run vua -- status` |
| `adapters` | Lista adaptadores e capacidades | `npm run vua -- adapters` |
| `bench` | Mede throughput e latência criptográfica no ambiente atual | `npm run vua -- bench` |
| `invoke` | Executa uma ação governada em um adaptador | `npm run vua -- invoke linux check_sandbox` |
| `conformance` | Executa a conformidade dos adaptadores | `npm run vua -- conformance` |
| `verify` | Verifica um `ExecutionProof` | `npm run vua -- verify proof.json` |
| `mcp` | Inicia o MCP por stdio | `npm run vua -- mcp` |

## 4. Servidor web e MCP HTTP

Para iniciar a interface web e o servidor HTTP local:

```bash
npm run dev
```

O servidor usa `PORT` quando definido e, por padrão, escuta em `3000`. Verifique a disponibilidade com:

```bash
curl -fsS http://localhost:3000/api/health
```

Rotas relevantes:

- `GET /api/health`: health check;
- `GET /api/vortex/status`: status e identidade;
- `GET /mcp`: metadados MCP ou SSE conforme o cabeçalho `Accept`;
- `GET /sse`: SSE dedicado;
- `POST /mcp`: transporte HTTP direto;
- `POST /mcp/messages?sessionId=...`: mensagens do transporte SSE.

`npm run vua -- mcp` é outro modo: inicia MCP por **stdio** para clientes como Claude Desktop, Cursor e VS Code. Ele não substitui `npm run dev` e não deve ser documentado como servidor HTTP.

## 5. Uso como biblioteca

Os fontes TypeScript podem ser importados dentro do projeto com um loader TypeScript, por exemplo `tsx`. O campo `main` aponta para `src/vortex/index.ts`; isso descreve o source entrypoint e não um bundle JavaScript autônomo para Node sem loader.

```typescript
import { executeVortexPipeline } from './src/vortex/index.js';

const result = await executeVortexPipeline({
  requestId: 'req-001',
  operation: 'fs.read_restricted',
  target: { path: '/etc/os-release' },
  input: { format: 'json' },
});

console.log(result);
```

## 6. Validação local

```bash
npm run lint
npm run test:unit
npm run test:integration
npm run test:security
npm run test:ci
npm run build
```

Consulte [ONBOARDING.md](./ONBOARDING.md) para o fluxo completo, incluindo a matriz K6.
