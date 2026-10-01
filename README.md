# VUC — Vortex Universal Connector

> **VUC é a implementação executável do Vortex.**
>
> **Proof over prose. HASH + TEMPO + LOG.**

[![npm](https://img.shields.io/npm/v/%40vucfoundation%2Fvuc)](https://www.npmjs.com/package/@vucfoundation/vuc)
[![CI](https://github.com/scoobiii/vuc/actions/workflows/ci.yml/badge.svg)](https://github.com/scoobiii/vuc/actions/workflows/ci.yml)

[Estado vivo do CI](./docs/CI-STATUS.md)

**Idiomas:** [中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Tiếng Việt](./README.vi.md) · [Français](./README.fr.md) · [Italiano](./README.it.md) · [Bahasa Indonesia](./README.id.md) · [Malay](./README.ms.md) · [English](./README.en.md)

## Em uma frase

**VUC conecta uma tarefa a uma capacidade de execução e mostra o que realmente aconteceu.**

```text
PEDIDO
  ↓
VUC
  ↓
CAPABILITY / CONNECTOR / RUNTIME
  ↓
EXECUÇÃO
  ↓
RESULTADO + LOG + EVIDÊNCIA
```

Se não houver evidência suficiente, o sistema não deve apresentar o resultado como comprovado.

---

## Vortex → VUC

```text
VORTEX
arquitetura + contratos + governança + evidência
                    ↓
VUC
implementação executável + CLI + conectores + CI
                    ↓
USER / DEV / AGENT
execução observável
```

### Responsabilidades

| Camada | Papel |
|---|---|
| **Vortex** | define a arquitetura e o contrato de execução governada |
| **VUC** | implementa, executa, testa e distribui |
| **VUA** | legado/compatibilidade histórica |

> **VUA é legado.** Não trate VUA como o núcleo atual nem como o produto principal. Referências ao nome podem permanecer no código/CLI por compatibilidade, mas novas capacidades pertencem ao VUC.

---

## Instalação

Versão alvo atual:

```text
@vucfoundation/vuc@1.0.2
```

Instalação global:

```bash
npm install -g @vucfoundation/vuc@1.0.2
```

Verifique o executável:

```bash
which vuc
vuc --version
```

Contrato de distribuição:

```text
vuc    → ./dist/vua.cjs
vua    → ./dist/vua.cjs   # compatibilidade legada
vortex → ./dist/vua.cjs   # alias de compatibilidade
```

**Canônico: `vuc`.**

O nome interno do arquivo `dist/vua.cjs` é uma herança de compatibilidade; isso não torna VUA o produto atual.

---

## Onboarding em 60 segundos

Depois de instalar:

```bash
vuc --version
vuc status
vuc adapters
vuc conformance
vuc repo inspect
```

A leitura é:

```text
status       → onde estou e qual runtime estou usando
adapters     → quais capacidades estão disponíveis
conformance  → quais contratos passaram
repo inspect → qual estado de governança do repositório foi observado
```

Para automação, prefira interfaces estruturadas quando disponíveis e trate `UNKNOWN` como diferente de `PASS`.

---

## Para uma criança

Pense no VUC como uma caixa que recebe uma tarefa:

```text
"faça isso"
    ↓
VUC tenta fazer
    ↓
VUC registra o que aconteceu
    ↓
VUC mostra a prova disponível
```

Se não consegue provar, não deve fingir que conseguiu.

---

## Para um desenvolvedor

O VUC combina:

- CLI;
- runtime de execução governada;
- conectores;
- MCP;
- execution proof/evidence;
- testes unitários e de integração;
- testes de segurança;
- testes de mock detection;
- testes de stress/chaos/performance;
- gates de CI;
- integração DREX/Bend em fluxos específicos.

O escopo efetivamente comprovado deve ser lido nos testes e artefatos de CI, não inferido apenas pela existência de código.

---

## Para um agente

Discovery:

```text
1. descubra o VUC
2. leia a capability disponível
3. identifique o adapter/connector
4. invoque a ação
5. capture resultado e erro
6. capture evidence/proof quando disponível
7. verifique o estado
8. só então declare o nível de sucesso suportado pela evidência
```

Modelo:

```text
DOCUMENTADO
    ≠
IMPLEMENTADO
    ≠
EXECUTADO
    ≠
VERIFICADO
```

---

## Capacidades

O pacote atual contém superfícies para:

- execução governada;
- adapters/connectors;
- MCP;
- GitHub;
- GCloud;
- Linux;
- Android;
- Windows;
- Bluesky;
- Bend;
- Colab;
- canary;
- provas/evidências;
- DREX;
- benchmarks;
- governança e políticas.

**A presença de uma capacidade no código não é, sozinha, prova de que a integração externa foi executada.**

Por isso o estado deve ser determinado por:

```text
IMPLEMENTAÇÃO
+
TESTE
+
EXECUÇÃO
+
EVIDÊNCIA
```

quando todos forem aplicáveis.

---

## Conformance e prova

O VUC trabalha com provas e evidências de execução, incluindo fluxos baseados em:

- SHA-256;
- canonicalização RFC 8785/JCS;
- identidade/assinatura Ed25519;
- execution IDs;
- hashes de entrada/saída;
- logs;
- artefatos de CI.

Esses mecanismos provam **claims específicos**. Eles não significam que qualquer side-effect externo esteja automaticamente comprovado.

---

## CI

O workflow principal é:

```text
.github/workflows/ci.yml
```

A CI atual executa, entre outros:

- auditoria do runner;
- Node 22 LTS;
- instalação/verificação do runtime Bend;
- normalização e verificação do lockfile;
- auditoria GOS3;
- suíte `npm run test:ci`;
- build de produção;
- upload de evidência de execução.

O significado de um PASS é restrito ao gate que efetivamente executou.

---

## Distribuição npm: teste real do produto

O pacote distribuído é parte do contrato do VUC.

O gate correto é:

```text
SOURCE
  ↓
npm pack
  ↓
CLEAN INSTALL
  ↓
vuc / vua / vortex
  ↓
CLI CONTRACT
  ↓
CONFORMANCE / EVIDENCE
  ↓
REGISTRY INSTALL
  ↓
MESMO TESTE
```

Não basta testar somente o código-fonte. O artefato distribuído também precisa ser validado.

---

## Desenvolvimento local

```bash
git clone https://github.com/scoobiii/vuc.git
cd vuc
npm ci
npm run build:cli
npm run test:cli
npm run test:ci
```

Testes específicos disponíveis incluem:

```bash
npm run test:unit
npm run test:integration
npm run test:security
npm run test:mock
npm run test:stress
npm run test:chaos
npm run test:bench
npm run test:mcp-proof
npm run test:mcp-conformance
npm run test:execution-evidence
npm run test:tenant-policy
```

---

## DREX / Bend / GPU

O VUC possui fluxos específicos para DREX, Bend e benchmarks de runtime.

Esses fluxos devem ser tratados separadamente de claims gerais sobre o produto.

Especialmente:

```text
código GPU ≠ execução GPU comprovada
```

Execução GPU deve possuir evidência correspondente ao workload, ambiente e runtime usados.

---

## Estado da verdade

| Estado | Significado |
|---|---|
| **PASS** | gate executado e passou |
| **FAIL** | gate executado e falhou |
| **RUNNING** | execução em andamento |
| **UNKNOWN** | não existe evidência suficiente |

`UNKNOWN` nunca deve ser convertido silenciosamente em `PASS`.

---

## Documentação

A documentação deve manter a mesma verdade do CI.

Arquitetura:

```text
PROMETEMOS
    ↓
ENTREGAMOS
    ↓
CI TESTA
    ↓
CI PROVA
    ↓
DOCS REFLETEM
    ↓
USER / DEV / AGENT USA
```

O objetivo é eliminar divergência manual entre código, CI, README e documentação.

---

## VUA — legado

**VUA não é o nome do núcleo atual.**

O termo pode aparecer porque:

- existem binários/aliases históricos;
- existem arquivos internos legados;
- há compatibilidade com instalações anteriores;
- alguns contratos e artefatos históricos ainda usam o nome.

Isso não deve ser interpretado como nova arquitetura.

```text
NOVO
  ↓
VORTEX + VUC

LEGADO
  ↓
VUA
```

---

## Licença

MIT.

---

## Regra final

> **Vortex define. VUC implementa. CI prova. Evidência registra.**

**Código existir não significa que rodou.  
Rodar não significa que o efeito externo foi comprovado.  
Prova específica é melhor que afirmação genérica.**
