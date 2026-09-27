# Deliverables Matrix

| Área | Entregável | Verificação |
|---|---|---|
| Produto | Story + acceptance criteria | PO |
| Processo | Sprint/impedimentos | Scrum |
| Arquitetura | ADR/contrato | Architecture review |
| Código | implementação | lint/build/tests |
| QA | testes e matriz | test suite |
| Cobertura | coverage report | coverage gate |
| Segurança | security checks | security gate |
| Mock integrity | audit | mock gate |
| Performance | benchmark | performance gate |
| Evidência | execution evidence | evidence validation |
| Artifact | package/build | artifact E2E |
| CI | clean runner execution | required check |
| PR | review + checks | branch protection |
| Release | versioned artifact | release verification |

## Gate contract

A entrega segue:

PASS -> próximo estágio

FAIL -> bloqueia

SKIPPED / NEUTRAL / WARNING -> não satisfaz gate obrigatório.

## Common acceptance record

Toda entrega governada deve conseguir identificar:

- repository
- project
- role
- actor
- branch
- commit SHA
- PR
- test suite
- coverage
- security
- mock audit
- performance
- artifact
- final result

## Generalização

A matriz é agnóstica de linguagem. Node, Python, Android, C/C++, PHP e outros projetos podem implementar os mesmos conceitos usando seus próprios comandos e ferramentas.
