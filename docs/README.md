# VUC — Documentação Oficial

**VUC (Vortex Universal Connector) / Governed Execution Runtime**
Repositório oficial: `https://github.com/scoobiii/vuc.git`

## Status atual

O VUC é um runtime de execução governada com CLI `vuc` e alias `vua`, biblioteca TypeScript/Node.js `@vortexfoundation/vuc`, adaptadores multiambiente, MCP e verificação criptográfica de `ExecutionProof`.

O pacote está configurado para npm como `@vortexfoundation/vuc` e expõe os comandos `vuc` e `vua` pelo campo `bin`. Isso comprova a configuração do pacote; a publicação no registry é um gate separado.

A integração Linux atual é nativa em nível de userspace/CLI. Ainda não é um binário ELF independente nem uma distribuição `.deb`, `.rpm` ou `.apk`.

## Índice

| Guia | Conteúdo |
|---|---|
| [Onboarding](./ONBOARDING.md) | instalação verificável, CLI, MCP, matriz K6 local/CI e limites de prontidão externa |
| [01. Visão Geral e CLI](./01-visao-geral-e-instalacao.md) | instalação, CLI, biblioteca e pacote npm |
| [02. Mobile APK](./02-mobile-apk-sem-github.md) | arquitetura mobile |
| [03. LLM](./03-llm-browser-e-qwen-gemini.md) | integração local/cloud |
| [04. Termux e Alpine](./04-termux-e-alpine-proot.md) | execução ARM64 e benchmarks |
| [05. Adapters](./05-adapters-local-vs-github-remoto.md) | GitHub, Linux, Android, Windows e MCP |
| [06. Agent Patch Arena](./06-agent-patch-arena-ci.md) | gates de patches |
| [07. Conectores](./07-conectores-e-adaptadores.md) | catálogo técnico |
| [08. Claude App](./08-conectar-ao-claude-app.md) | integração MCP |
| [09. Baseline](./governance/BASELINE-TOLERANCE-REPORT.md) | baseline dinâmica |
| [Product Status](./PRODUCT-STATUS-2026-09-17.md) | produto, mercados, evidências e gates de release |
| [Linux Native CLI Status](./LINUX-NATIVE-CLI-STATUS.md) | limites atuais da integração Linux |
| [Produtos por Indústria](./VUA-PRODUTOS-SERVICOS-POR-INDUSTRIA.md) | aplicações e modelos de oferta |

## CLI no checkout

```bash
npm ci
npm run vua -- status
npm run vua -- adapters
npm run vua -- bench
npm run vua -- verify proof.json
npm run vua -- mcp
```

Para o servidor HTTP e a interface web, use `npm run dev`. O health check padrão é `http://localhost:3000/api/health`.

## Matriz K6

A matriz declarada contém oito cenários: `smoke`, `load`, `stress`, `spike`, `soak`, `chaos`, `degradation` e `industry` (incluindo a cobertura dos oito segmentos industriais).

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

O workflow [K6 Scenario Coverage](../.github/workflows/k6-scenario-coverage.yml) executa a mesma matriz no CI. `100%` neste contexto significa todos os cenários e segmentos declarados; não significa cobertura de linhas TypeScript. Sem `bin/k6`, o runner usa o fallback interno documentado no onboarding.

## Prontidão para clientes externos

Os gates automatizados comprovam propriedades do código e do runtime, mas não equivalem a uma aprovação de produção. A disponibilização externa ainda exige autenticação/autorização e isolamento por cliente, gestão de secrets, observabilidade operacional, baseline de performance definitiva e validação das integrações cloud reais além do fallback SQLite. O PR [#11](https://github.com/scoobiii/vuc/pull/11) está aprovado e mesclado; suas evidências devem ser consideradas junto desses critérios, não como substituição deles.

## Pacote npm

```bash
npx @vortexfoundation/vuc status
npm install -g @vortexfoundation/vuc
vuc status
# O alias legado também é exposto:
vua status
```

Esses comandos dependem da publicação efetiva do pacote no registry. Em desenvolvimento, use os scripts locais acima.
