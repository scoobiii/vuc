# Agile/Scrum Team — Governed Delivery

## Princípio

A equipe humana e os agentes trabalham sob o mesmo fluxo de entrega:

HUMANO ou AGENTE -> branch -> CI LOCAL -> PASS -> PR -> CI LIMPO -> TODOS OS GATES PASS -> MERGE

O papel identifica responsabilidade. O CI identifica qualidade. Nenhum papel recebe exceção de qualidade.

## Papéis

| Perfil | Responsabilidade | Entregável principal | Aceite |
|---|---|---|---|
| dev-po | Produto | backlog, histórias, critérios de aceite | requisitos rastreáveis e aceitos |
| dev-sm | Processo | sprint, impedimentos, fluxo | trabalho rastreável e sem bypass |
| dev-arch | Arquitetura | ADR, contratos, desenho técnico | arquitetura verificável |
| dev-be | Backend | código, APIs, testes | CI + cobertura PASS |
| dev-fe | Frontend/CLI | UI/CLI, testes | CI + cobertura PASS |
| dev-qa | Qualidade | testes, matriz, evidências | gates reproduzíveis |
| dev-sec | Segurança | threat model, controles, testes | security PASS |
| dev-devops | Plataforma | CI/CD, runners, release | pipeline reproduzível |
| dev-data | Dados/Benchmark | datasets, métricas, benchmarks | evidência reproduzível |

## Entregável de uma mudança

Toda mudança deve produzir, quando aplicável:

1. requisito/história rastreável;
2. branch;
3. implementação;
4. testes;
5. documentação;
6. evidência;
7. benchmark/performance quando aplicável;
8. artefato;
9. PR;
10. CI PASS;
11. revisão;
12. merge.

## Agente

Um agente pode atuar em qualquer perfil autorizado. A identidade do agente é registrada como proveniência. O agente usa exatamente o mesmo branch, CI, PR, evidência e critérios de aceite de um humano.

Não existe "CI de agente" separado.

## Definition of Done

Uma entrega somente está DONE quando:

- implementação concluída;
- testes concluídos;
- cobertura exigida PASS;
- segurança PASS;
- mock audit PASS quando aplicável;
- performance PASS quando aplicável;
- artifact/E2E PASS quando aplicável;
- evidência registrada;
- documentação atualizada;
- PR aprovado;
- todos os required checks PASS.

SKIPPED, NEUTRAL ou WARNING não satisfazem um required check.

## Rastreabilidade

Cada entrega deve permitir seguir:

requisito -> responsável -> branch -> commit SHA -> PR -> CI -> evidência -> artefato -> merge
