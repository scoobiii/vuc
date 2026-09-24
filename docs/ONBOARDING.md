# Onboarding VUA/VUC

Este guia descreve o fluxo verificável para obter o projeto, executar o CLI, iniciar o servidor, conectar clientes MCP e rodar a matriz completa de testes K6. Os comandos abaixo foram alinhados com os scripts existentes no `package.json` e com os workflows do repositório.

## 1. Pré-requisitos

Use Node.js 22 ou uma versão compatível com o campo `engines` do projeto. Para instalação reproduzível, tenha npm disponível. O binário oficial `k6` é opcional: quando `bin/k6` não existe, `tests/k6/k6-runner.ts` usa o runner de compatibilidade interno, que valida disponibilidade do gateway e os invariantes básicos; isso não deve ser confundido com uma medição feita pelo motor oficial K6.

## 2. Instalação do checkout

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
```

`npm ci` é o caminho recomendado tanto localmente quanto no CI. O pacote npm está configurado como `@vortexfoundation/vua`, mas os comandos `npx @vortexfoundation/vua ...` e `npm install -g @vortexfoundation/vua` dependem de publicação efetiva no registry. Para trabalhar no checkout, use os scripts locais.

## 2.1. Limite de prontidão para clientes externos

Este onboarding valida instalação, execução local, MCP e a matriz de cenários. **Ele não declara o serviço pronto para clientes externos.** Antes de uma disponibilização externa, a equipe deve fechar e evidenciar, de forma repetível:

- autenticação, autorização e isolamento por cliente (multi-tenant);
- gestão de credenciais e secrets em produção, sem depender de valores locais ou de desenvolvimento;
- observabilidade operacional completa, incluindo logs estruturados, métricas, traces, alertas e correlação por requisição;
- resolução definitiva da baseline de performance, com perfil, hardware, tolerâncias e procedimento de atualização versionados;
- integração dos resultados e evidências do PR [#11](https://github.com/scoobiii/vuc/pull/11), que já foi aprovado e mesclado, sem tratá-lo como substituto da validação operacional;
- validação real das integrações cloud suportadas, além do fallback SQLite.

Até que esses itens tenham evidência de aceite em ambiente de produção ou staging representativo, o uso recomendado é desenvolvimento, validação interna ou ambiente controlado.

## 3. CLI local

No checkout, use `npm run vua -- ...`; não use `npm link` seguido de `vua status`, porque o entrypoint JavaScript do CLI importa módulos TypeScript do código-fonte e requer o loader `tsx` durante o desenvolvimento.

```bash
npm run vua -- status
npm run vua -- adapters
npm run vua -- bench
npm run vua -- verify proof.json
npm run vua -- mcp
```

O comando `npm run vua -- mcp` inicia o servidor MCP por **stdio**, destinado a clientes como Claude Desktop, Cursor e VS Code. O comando não inicia o servidor HTTP.

## 4. Servidor web e MCP HTTP

Para iniciar a interface web e o servidor HTTP local:

```bash
npm run dev
```

O servidor escuta na porta definida por `PORT` (a porta padrão do projeto é 3000) e expõe, entre outros, os endpoints:

| Endpoint | Uso |
|---|---|
| `GET /api/health` | health check do servidor |
| `GET /api/vortex/status` | identidade e diagnóstico VUA |
| `GET /mcp` | metadados MCP ou canal SSE conforme `Accept` |
| `GET /sse` | canal SSE dedicado |
| `POST /mcp` | transporte HTTP direto MCP |
| `POST /mcp/messages?sessionId=...` | mensagens do transporte SSE |

Em outro terminal:

```bash
curl -fsS http://localhost:3000/api/health
```

A autenticação/configuração OAuth do servidor deve ser respeitada em ambientes onde ela estiver habilitada. Não coloque tokens em arquivos de documentação, logs ou commits.

## 4.1. Barreira interna VUC/VUA antes do CI externo

A primeira barreira é executada dentro do checkout, antes de qualquer push. O runtime carrega o AGENTS.md como system instruction normativo do LLM, valida os marcadores do contrato, executa os testes de governança, realiza uma execução real pelo Gateway e verifica a ExecutionProof independentemente.

```bash
npm ci
npm run preflight
```

O preflight é fail-closed e declara `external_effect=none`. Ele não pode aprovar uma execução sem prova verificável e rejeita assinatura sintética (`mock-sig`). O `npm ci` habilita o hook `.githooks/pre-push`, que executa o mesmo preflight antes de permitir o push.

No CI, o workflow `VUC Internal Governance Gate` reproduz essa barreira em ambiente limpo. Uma aprovação local não substitui os checks externos do GitHub; ela apenas impede que uma alteração conhecida como quebrada seja enviada sem passar pela primeira barreira.

## 4.2. MCP → connector real → ExecutionProof

O caminho mínimo validado pelo projeto é:

    MCP tools/call
      → VUA adapter
      → real execution
      → ExecutionProof
      → independent Ed25519/JCS/hash verification
      → VERIFIED

A integração deve ser executável e verificável. Um retorno de CI, log ou resposta textual não substitui a prova criptográfica.

O teste de integração dedicado é:

    npm run test:mcp-proof

A suíte de integração também incorpora esse gate:

    npm run test:integration

O contrato proíbe mock-sig e falha quando a prova está ausente, a assinatura é inválida, a identidade não corresponde ou os hashes não conferem.

### Primeiro alvo de compatibilidade

O primeiro host de referência é GPT. O desenho permanece independente do host sempre que o cliente puder consumir MCP.

A sequência de certificação é:

1. MCP local;
2. connector real;
3. ExecutionProof verificável;
4. primeiro connector cloud;
5. host GPT;
6. demais hosts LLM;
7. catálogo de connectors.

### Operação comercial futura

O primeiro agente comercial previsto é o Onboarding & Discovery Agent. Ele poderá consultar, auditar e registrar dados autorizados via connectors CRM/ERP, separando fatos, hipóteses, evidências e premissas para CAPEX/OPEX/ROI.

Isso é roadmap de produto, não declaração de disponibilidade GA.
## 5. Validação local convencional

```bash
npm run lint
npm run test:unit
npm run test:integration
npm run test:security
npm run test:ci
```

`npm run test:ci` executa os gates de execução e evidência definidos pelo projeto. O benchmark local (`npm run bench`) é uma medição do ambiente atual e não deve ser apresentado como SLA universal.

## 6. Matriz K6 completa local

A matriz cobre oito cenários: smoke, load, stress, spike, soak, chaos, degradation e os segmentos industriais financeiros/todos. Com o servidor rodando em outro terminal, execute:

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

Para executar a cadeia padrão do runner:

```bash
npm run test:k6
```

A cadeia padrão cobre smoke, load, chaos, stress e a matriz industrial. Os cenários spike, soak e degradation são executados explicitamente pelos comandos acima para que a cobertura da matriz inteira seja inequívoca. A execução industrial informa `8/8` segmentos quando a matriz completa é concluída.

Se `bin/k6` existir, o runner executa os arquivos `tests/k6/*.js` com o binário K6. Se não existir, ele usa o fallback interno e registra essa condição; nesse modo, os resultados não são equivalentes a uma medição oficial do motor K6.

## 7. Cobertura K6 no CI

O workflow `K6 Scenario Coverage` executa a mesma matriz em ambiente GitHub Actions. Ele instala dependências com `npm ci`, inicia o servidor, espera o health check e executa os oito comandos de cenário. O workflow falha no primeiro cenário que não retornar sucesso.

A cobertura indicada pelo workflow significa **100% dos cenários K6 e segmentos industriais declarados**, não 100% de cobertura de linhas TypeScript. Para cobertura de código, use os gates de lint, unitários, integração e segurança.

## 8. Critérios de interpretação

Um cenário aprovado demonstra que seus checks e thresholds foram satisfeitos no ambiente executado. Os resultados de carga variam com hardware, runner, rede e concorrência. Não compare números de K6 entre ambientes diferentes como se fossem uma única baseline. Evidência de execução também não substitui autorização, verificação semântica ou revisão de segurança.

## 9. Fluxo mínimo para uma alteração

```bash
npm ci
npm run lint
npm run test:unit
npm run test:integration
npm run test:security
npm run test:k6
npm run build
git diff --check
```

Antes de abrir ou mesclar um PR, confirme os checks do GitHub Actions e não faça merge apenas com base em uma execução local.
