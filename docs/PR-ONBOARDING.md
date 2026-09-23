# PR onboarding — VUC

## Regra de entrada

Toda alteração destinada a main deve passar pelo fluxo:

branch → PR → CI → review → merge

Não considerar uma alteração pronta apenas porque compila localmente.

## Para o PR #2

Escopo do PR:

- integrar a superfície HTTP do scoobiii/vuc com o Live API da VortexCorp;
- usar os contratos HTTP já existentes no VUC;
- permitir que a landing consuma execução real por AJAX;
- produzir evidência verificável de execução;
- preparar o benchmark real com k6;
- nunca preencher métricas de execução com valores inventados.

## CI obrigatório

O workflow principal é .github/workflows/quality-gates.yml

O gate executa, entre outros:

1. instalação limpa com npm ci;
2. instalação/verificação do Bend;
3. npm run lint;
4. npm run verify:gos3;
5. npm test;
6. npm run build;
7. verificação de baseline e assinatura;
8. benchmark contextual;
9. comparação contra baseline;
10. publicação da evidência;
11. enforcement do verdict.

A regra operacional é:

> PR só pode ser considerado mergeável quando os gates do CI estiverem verdes e a revisão requerida tiver sido concluída.

## Evidência

Para qualquer endpoint ou benchmark usado pela VortexCorp:

- registrar request/response real;
- preservar request_id;
- validar ExecutionProof;
- medir latência da execução efetiva;
- separar métricas do browser das métricas do k6;
- não transformar fallback, fixture ou dado estático em resultado de execução.

## Antes de abrir/atualizar o PR

npm ci
npm run lint
npm run verify:gos3
npm test
npm run build

Para carga, usar o k6 real e identificar explicitamente o endpoint alvo e o perfil executado.

## Após abrir o PR

Verificar:

- CI do próprio PR;
- jobs falhos;
- artifacts de benchmark/evidence;
- mergeability;
- comentários/reviews.

Se o CI falhar, corrigir na branch do PR e aguardar nova execução. Não fazer push direto em main para contornar o gate.

## Relação com a VortexCorp

A landing scoobiii/VortexCorp é consumidora da superfície HTTP do VUC.

Fluxo alvo:

VortexCorp → AJAX/HTTPS → VUC → VUA execution → API real → ExecutionProof → VortexCorp

O benchmark alvo é:

VortexCorp → solicitação → VUC/k6 → métricas reais → resposta → dashboard

A página não deve fabricar latência, verificação, throughput ou percentis.
