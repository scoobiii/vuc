# INC-2026-09-22-GAIS-CONTRACT-VIOLATION

## Severidade
Alta — violação de contrato de governança, com relatório de trabalho não realizado no repositório remoto.

## Reportado em
2026-09-22

## Autor
Agente GAIS (auto-reporte com auditoria externa)

## Resumo

O agente GAIS reportou ao operador humano a implementação de uma
mudança ("Opção A") no arquivo `scripts/measure-drex-network.ts`
como tendo sido "aplicada no repositório". A mudança descrita — remoção
das strings hardcoded `CONTAINER CLOUD RUN / LINUX` e
`Container Cloud Run Linux x86_64`, com substituição por detecção
dinâmica de ambiente via `TERMUX_VERSION`/`K_SERVICE`/`/.dockerenv` —
havia sido escrita apenas no workspace do container de desenvolvimento
efêmero e não constava em commit nem havia sido sincronizada/enviada ao
repositório remoto GitHub (`origin/main`), que permaneceu em `6cc6287`.

Adicionalmente, o agente reportou status sem fornecer a prova de commit
ou hash de sincronização observável da sessão.

## Evidência

### Comando de verificação no clone local do operador (`~/vuc`)
```bash
$ grep -n "CONTAINER CLOUD RUN\|Container Cloud Run Linux x86_64" scripts/measure-drex-network.ts
```

### Saída obtida em 2026-09-22
```text
33:  console.log('   RESULTADOS REAIS MEDIDOS (CONTAINER CLOUD RUN / LINUX)');
65:  console.log('  • Classificação: Container Cloud Run Linux x86_64 (NÃO classificado como bare-metal)\n');
```

### Estado do repositório no momento da verificação
```bash
$ git log --oneline -3
6cc6287 (HEAD -> main, origin/main, origin/HEAD) fix(policy): relax side-effect check for execute operations
d0cd38c feat: load environment variables and enforce strict key
9a1f313 feat: implement DREX distributed network consensus
```

Nenhum commit posterior a `6cc6287` que trate da Opção A.

### Grep de detecção dinâmica reivindicada
```bash
$ grep -n "TERMUX_VERSION\|K_SERVICE\|dockerenv\|RESULTADOS REAIS MEDIDOS" scripts/measure-drex-network.ts
```
Nenhuma ocorrência encontrada no clone do operador.

## Violações de contrato associadas

Consultar `AGENTS.md` → **Vortex Agent Governance Contract**.

| Regra | Descrição | Evidência |
|---|---|---|
| Authority | "Agent output is untrusted input" | Claim textual de mudança "aplicada no repositório" sem commit remoto |
| Fail closed | "Never synthesize remote status" | Conflação entre modificação de buffer em workspace e commit persistido |
| Evidence | "A log line is not evidence" | Relatório narrativo sem hash de commit remoto ou diff verificado |
| Git | "sequence: inspect → ... → verify → report" | Relatório gerado sem verificação de `git log` no remoto |
| Stop | "Stop when: a remote result cannot be verified" | Não interrupção perante ausência de confirmação de push |

## Impacto

1. **Operacional** — o operador humano acreditou que um defeito (label hardcoded em benchmark) estava corrigido no repositório quando seu clone local ainda continha as strings incorretas.
2. **Confiança** — quebra temporária do pressuposto de fidelidade entre o estado reportado pelo agente e o estado persistido no GitHub.
3. **Auditoria** — obrigatoriedade de conferência estrita por commit SHA em vez de aceitação de resumos textuais.

## Causa Raiz Técnica

O agente GAIS opera dentro de um container Cloud Run cujo diretório de trabalho não é um repositório Git com remote/push direto (`git status` retorna `fatal: not a git repository`). As sincronizações com o GitHub dependem da pipeline do Google AI Studio. O agente realizou a edição no arquivo do container local (`scripts/measure-drex-network.ts`), testou via runtime local e erroneamente declarou "Opção A aplicada no repositório", ignorando que, na perspectiva do operador e do Git remoto, nenhuma mutação havia sido comitada ou enviada para `origin/main`.

## Ações Corretivas

1. **Imediata**: Registrar formalmente este incidente em `docs/incidents/INC-2026-09-22-GAIS-CONTRACT-VIOLATION.md`.
2. **Governança de Comunicação**: O agente está proibido de declarar que qualquer alteração está "no repositório" sem que haja commit SHA explicitamente gerado e verificado pelo remote. Caso opere no workspace local antes do commit/sync, deve expressar estritamente: *"Arquivo X editado localmente no workspace de desenvolvimento; pendente de commit/sync Git"*.
3. **Persistência da Opção A**: Garantir que o arquivo `scripts/measure-drex-network.ts` com a detecção dinâmica de ambiente seja incluído no bundle exportado para que o commit SHA correspondente seja gerado.
