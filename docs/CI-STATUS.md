# VUC — CI como fonte de verdade

> **Regra:** documentação não declara como entregue aquilo que o CI não comprovou.

## Prometemos

- um runtime VUC instalável pelo npm;
- `vuc` como CLI canônico;
- `vua` como compatibilidade;
- `vortex` como alias;
- capacidades declaradas somente quando houver implementação e teste correspondentes;
- evidência de execução para os gates que exigem prova.

## Entregamos

O estado abaixo deve ser lido junto com o workflow de CI. O badge é dinâmico e aponta para a execução real:

![VUC CI](https://github.com/scoobiii/vuc/actions/workflows/ci.yml/badge.svg)

**Workflow:** `VUC CI — Governed Sandbox Runtime & Integrity`

**Package alvo:** `@vucfoundation/vuc@1.0.2`

**Binários declarados no package.json:**

```text
vuc    -> ./dist/vua.cjs
vua    -> ./dist/vua.cjs
vortex -> ./dist/vua.cjs
```

## O que o CI realmente verifica

O workflow atual executa, entre outros gates:

- instalação reproduzível via `npm ci`;
- auditoria do runtime do runner;
- auditoria GOS3;
- suíte `npm run test:ci`;
- build de produção;
- artefatos de evidência de execução.

A lista de capabilities do produto não deve ser inferida apenas do badge. Para cada capability, a fonte de verdade é o teste/evidência correspondente.

## Como usar

### Pessoa

```bash
npm install -g @vucfoundation/vuc@1.0.2
vuc status
vuc adapters
vuc conformance
vuc repo inspect
```

### Developer

Use o CLI, MCP e APIs documentadas para integrar o VUC ao seu sistema.

### Agent

O agente deve descobrir a capability, executar dentro da política e continuar somente quando o resultado/prova esperado estiver válido.

## Estado

- **PASS:** gate executado e aprovado.
- **FAIL:** gate executado e falhou.
- **RUNNING:** execução ainda em andamento.
- **UNKNOWN:** não existe evidência suficiente.

**UNKNOWN não é PASS.**

## Regra de atualização

README e documentação devem consumir o estado produzido pelo CI. Atualizações manuais de números, percentuais ou resultados de testes são proibidas quando o valor puder ser obtido da evidência.

Para um dashboard AJAX completo, o CI deve publicar uma fonte JSON versionada/imutável por execução; a interface pode então fazer `fetch()` desse JSON sem duplicar a verdade no HTML/Markdown.


## Preparação da release 1.0.3 e base multimodal

A auditoria de 1.0.3 deve ser tratada como gate de release, não como declaração antecipada de aprovação. O pacote 1.0.2 é a baseline documental consultada; versão publicada, tarball e checks devem ser verificados separadamente.

A arquitetura multimodal está documentada em [MULTIMODAL-ARCHITECTURE.md](./MULTIMODAL-ARCHITECTURE.md), em estado de proposta. Esta atualização documental não adiciona runtime, dependências, APIs públicas nem altera o comportamento do pacote. A implementação multimodal fica condicionada à aprovação da auditoria 1.0.3 e a uma release posterior.

Não declare release 1.0.3 pronta até comprovar: suíte de testes, typecheck/build, segurança, compatibilidade, cobertura medida, instalação limpa do tarball, contrato CLI/MCP, evidências e estado dos workflows obrigatórios.
