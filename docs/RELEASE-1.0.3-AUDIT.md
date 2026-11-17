# Auditoria de release — VUC 1.0.3

> **Estado:** auditoria iniciada; não é certificado de release.  
> **Snapshot consultado:** 2026-11-17 (UTC).  
> **Baseline Git:** `main` em `d29fad3fa720cfd21c4f32a38da74329e528d752`.  
> **Baseline de código:** `package.json` declara `@vucfoundation/vuc@1.0.2`.  
> **Decisão:** 1.0.3 só pode ser promovido após fechar os gates aplicáveis e validar o tarball instalado.

## 1. Escopo da auditoria

A auditoria deve cobrir, no mínimo:

1. identidade do repositório, branches, tags e histórico de release;
2. package manifest, lockfile, tarball, binários e aliases;
3. CLI: comandos, códigos de saída, stdout/stderr e execução fora do checkout;
4. MCP: initialize, tools/list, autenticação, autorização, transporte e limites de rede;
5. conectores/adapters: registry, disponibilidade, IDs aceitos e semântica real versus simulada;
6. governança: AGENTS.md, policy loader, GOS3, scopes e fail-closed;
7. criptografia: JCS/RFC 8785, SHA-256, Ed25519, trust anchors e replay;
8. evidências: origem, integridade, vínculo request/response e limites dos claims;
9. segurança: dependências, SSRF, path traversal, segredos, permissões e sandbox;
10. testes: unit, integração, segurança, mocks, chaos, stress, mutation e cobertura;
11. CI: workflows obrigatórios, permissões, concorrência, artefatos e retenção;
12. compatibilidade: Node/npm, Linux x64/ARM64, Termux quando aplicável;
13. documentação: README, CLI, MCP, compatibilidade, status e changelog;
14. distribuição: npm pack, instalação limpa, execução dos três comandos e verificação pós-publicação.

## 2. Snapshot factual do baseline

| Item | Observação no snapshot | Tratamento |
|---|---|---|
| Branch principal | `main`, commit `d29fad3...` | Congelar SHA de auditoria |
| Package manifest | Versão declarada `1.0.2` | Conferir registry e tarball reais |
| Engines | Node >=22 e npm >=10 | Testar matriz suportada |
| Binários | `vuc`, `vua`, `vortex` apontam para `dist/vua.cjs` | Testar os três em instalação limpa |
| Arquivos npm | `files` inclui `AGENTS.md` | Confirmar conteúdo no tarball e no pacote instalado |
| README / CI status | Identificam 1.0.2 como versão-alvo | Atualizar somente com release verificada |
| GitHub Releases | Release listada mais recente: `v1.0.1` | Reconciliar tag/release versus package e npm |
| Checks do SHA base | 96 check runs concluídos como success no snapshot | Não confundir com cobertura real nem publicação npm |
| PRs abertos no baseline | #95, #93 e #90 | Classificar impacto e decidir merge/defer |
| Issues abertas no baseline | 15 | Triagem e fechamento com evidência |

O fato de `package.json` incluir `AGENTS.md` é apenas evidência do manifesto-fonte. Não comprova que o tarball publicado contém o arquivo, que o loader o resolve corretamente ou que a instalação global funciona.

## 3. Registro inicial de riscos e pendências

Os itens abaixo são issues abertas no snapshot. A descrição da issue é um relato/hipótese de defeito; a auditoria deve confirmar o caminho no código, reproduzir o comportamento e registrar evidência antes de declarar causa raiz.

| Issue | Prioridade registrada | Tema | Gate |
|---|---:|---|---|
| #96 | P0 | Cobertura real, thresholds, mutation testing e gate verificável | Qualidade |
| #84 | S0 condicional | Proteção de `vortex.llm.invoke`, transporte MCP HTTP e SSRF em `baseUrl` | Segurança |
| #83 | S0 | Conformidade emulada apresentada como PASS e leitura GitHub sem evidência remota | Integridade |
| #79 | S0 | Resolução da política pela raiz do pacote, não pelo CWD | Distribuição/governança |
| #78 | S0 | Presença de `AGENTS.md` no pacote npm e execução LLM fora do checkout | Distribuição/governança |
| #82 | S1 | Baselines do README sem vínculo reproduzível ao ambiente/medição | Documentação/benchmark |
| #81 | S1 | Divergência de inventário e contrato de adapters entre CLI/MCP | Contrato/API |
| #80 | S1 | Escopo npm documentado divergente do pacote `@vucfoundation/vuc` | Documentação/distribuição |
| #56 | — | Detecção de conflitos além de marcadores parciais | Integridade de CI |
| #85 | S2 | Campo `instructions` no resultado MCP `initialize` | Compatibilidade MCP |
| #44 | incidente | Release 1.0.2 sem validação do tarball e alias `vortex` no Termux | Distribuição |
| #47 | incidente | Análise arquitetural sem cadeia suficiente de evidências | Processo de auditoria |

### 3.1 Critérios mínimos para fechar os S0

- **#84:** definir o modelo de exposição do MCP; comprovar bind/interface e autenticação; testar destinos proibidos, redirecionamentos e ausência de credenciais. Se o transporte for exclusivamente local, documentar e testar essa fronteira.
- **#83:** sem credencial/conectividade, o estado remoto não pode ser PASS; separar `SIMULATED`, `NOT_EXECUTED`, `INDETERMINATE`, `FAIL` e `PASS`; calcular hashes sobre bytes realmente retornados.
- **#79/#78:** testar a política embutida no tarball a partir de diretório externo ao checkout; verificar override explícito; provar que arquivo arbitrário no CWD não substitui a política empacotada.
- **#96:** medir cobertura com instrumentação compatível com o runner real; publicar LCOV/JSON, thresholds e escopo; adicionar mutation testing nos módulos críticos. “100% Quality Gates” não significa “100% de cobertura”.

## 4. Pull requests abertas no baseline

| PR | Tema | Observação de triagem |
|---|---|---|
| #95 | Auditoria descritiva de ônibus/comparecimento eleitoral | Independente do core do pacote; validar limites de causalidade e decidir merge/defer |
| #93 | Visualizador CAD smoke / Governance Arena | Verificar escopo de UI/API, dependências e impacto no build principal |
| #90 | FreeCAD STEP/PDF smoke e documentação CAD/MCP | Verificar execução real do FreeCAD e artefatos antes de anunciar capacidade CAD |

Nenhuma PR deve ser incluída automaticamente na release. Cada uma precisa de diff review, CI, compatibilidade e decisão explícita de escopo.

## 5. Gates de release 1.0.3

| Gate | Evidência exigida | Estado inicial |
|---|---|---|
| R1 — Source baseline | SHA, branch, tags e diff auditados | Em andamento |
| R2 — Security S0 | Issues S0 reproduzidas/resolvidas ou risco formalmente aceito | Pendente |
| R3 — CLI/MCP contracts | Testes de contrato e compatibilidade | Pendente |
| R4 — Adapters | Fonte única de verdade e disponibilidade real | Pendente |
| R5 — Cryptography/evidence | Vetores JCS, testes Ed25519, hashes e verificação independente | Pendente |
| R6 — Quality | Cobertura medida, thresholds e mutation testing | Pendente |
| R7 — Build/test | typecheck, build e suíte completa | Pendente |
| R8 — Package | `npm pack`, manifesto, clean install e comandos reais | Pendente |
| R9 — Platform | Matriz Node/Linux/ARM64 e Termux quando suportado | Pendente |
| R10 — CI | Workflows obrigatórios verdes no SHA candidato | Pendente |
| R11 — Docs | README/CHANGELOG/CI status coerentes com evidência | Pendente |
| R12 — Publish | Versão, tag, provenance, digest e instalação do registry | Pendente |

**Regra de bloqueio:** qualquer S0 não resolvido e não formalmente aceito bloqueia a promoção. Um check verde não substitui os testes específicos de distribuição, segurança, cobertura ou integração externa.

## 6. Separação da base multimodal

A arquitetura multimodal está documentada em [MULTIMODAL-ARCHITECTURE.md](./MULTIMODAL-ARCHITECTURE.md), mas não integra o escopo funcional da release 1.0.3.

A auditoria de 1.0.3 deve verificar que:

- nenhum módulo multimodal foi adicionado ao runtime estável;
- nenhum dependency/model provider foi introduzido;
- nenhuma API pública ou schema de ExecutionProof foi alterado;
- a documentação identifica claramente proposta versus implementação;
- a implementação futura terá release, testes e gates próprios.

## 7. Relatório final obrigatório

O relatório de fechamento deverá registrar:

- SHA exato auditado;
- versão do Node/npm e sistema operacional;
- comandos executados e exit codes;
- resultados por gate;
- issues fechadas e respectivas evidências;
- riscos aceitos e responsável;
- arquivos/tarball, SHA-256 e provenance;
- tag/release e versão npm verificadas;
- decisão final: `GO`, `NO-GO` ou `CONDITIONAL-GO`.

Até esse relatório existir e os gates bloqueadores passarem, o estado da release é **AUDIT IN PROGRESS / NO-GO**.
