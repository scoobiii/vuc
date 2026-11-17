# VUC Multimodal — Arquitetura de referência

> **Status:** proposta arquitetural / documentação.  
> **Baseline:** VUC 1.0.2; preparação para a linha 1.0.3.  
> **Implementação:** não implica runtime multimodal disponível no pacote atual.  
> **Regra de release:** nenhuma dependência, API pública ou mudança de comportamento multimodal entra no pacote 1.0.3 por força deste documento.

## 1. Objetivo

Definir uma arquitetura extensível para governar modelos generativos e pipelines multimodais — texto, código, imagem e, em etapas futuras, áudio/vídeo — sem confundir:

- geração probabilística;
- execução observada;
- validação de propriedades;
- integridade/proveniência dos artefatos;
- prova de efeitos externos.

O VUC permanece como runtime/conector governado. Modelos podem ser locais ou remotos; o VUC não precisa treinar nem hospedar um modelo próprio para governar a execução.

## 2. Princípios normativos

1. **Contrato antes da inferência:** toda execução deve ter um pedido estruturado, modalidade, capacidades solicitadas, restrições, política e limites.
2. **Adaptadores explícitos:** cada fornecedor/runtime implementa um contrato versionado; não presumir equivalência entre provedores.
3. **Fail closed:** ausência de credencial, evidência, política ou verificador obrigatório não pode resultar em PASS.
4. **Separação de estados:** `DOCUMENTED`, `IMPLEMENTED`, `EXECUTED` e `VERIFIED` são estados diferentes.
5. **Claims limitados:** cada resultado de verificação declara exatamente a propriedade avaliada, o método, a versão e as limitações.
6. **Artefatos não confiáveis:** prompts, saídas de modelos, metadados, arquivos e resultados de ferramentas são dados não confiáveis até validação.
7. **Não regressão do pacote:** a arquitetura multimodal é documentação/planejamento durante o fechamento da versão 1.0.3; implementação deve ocorrer em release posterior e compatível.

## 3. Arquitetura lógica proposta

```text
USER / AGENT
    |
    v
Generation Request + Specification
    |
    v
VUC Governance Boundary
(identity, tenant, policy, scope, approval, limits)
    |
    v
Generative Orchestrator
(model selection, adapter contract, timeout, budget)
    |
    +----------------------+----------------------+
    |                      |                      |
    v                      v                      v
  LLM Runtime          Image Runtime         Future runtimes
  text/code            diffusion/DiT         audio/video
    |                      |
    +----------------------+
               |
               v
        Artifact Registry
     (bytes, media type, hash)
               |
               v
      Verification Pipeline
  syntax / schema / vision / geometry /
  topology / semantic / human review
               |
               v
      Decision + Evidence Record
       PASS / FAIL / UNKNOWN
               |
               v
       ExecutionProof (when supported)
               |
               v
       Bounded Output / Promotion
```

Este diagrama é conceitual. A presença de uma caixa não significa que ela já esteja implementada.

### 3.1 Responsabilidade por camada

| Camada | Responsabilidade | Não deve alegar |
|---|---|---|
| Request/specification | Expressar intenção, modalidade, restrições e critérios de aceite | Que o prompt garante o resultado |
| Governance boundary | Identidade, tenant, autorização, política e limites | Que autenticação isolada autoriza a ação |
| Orchestrator | Selecionar runtime/adaptador, aplicar timeout e orçamento | Que todos os provedores têm semântica idêntica |
| Generative runtime | Executar inferência e devolver artefatos/metadados | Que saída probabilística satisfaz invariantes |
| Artifact registry | Preservar bytes, media type, hash e vínculo à execução | Que hash prova semântica ou origem verdadeira |
| Verification pipeline | Avaliar propriedades declaradas com verificadores identificados | Que um detector neural é prova formal |
| Evidence/ExecutionProof | Registrar claims, entradas, saídas e verificações observadas | Que assinatura prova verdade factual ou efeito não observado |

## 4. Contrato de geração

O contrato lógico deve incluir, no mínimo:

- `request_id` e versão do schema;
- modalidade e tarefa;
- especificação e restrições obrigatórias;
- preferências não obrigatórias;
- runtime/adaptador solicitado;
- identificador e revisão do modelo, quando disponíveis;
- parâmetros de inferência efetivamente aceitos pelo runtime;
- seed, quando suportada;
- timeout, orçamento e limites de tamanho;
- hashes dos inputs e artefatos;
- política de retenção/privacidade;
- verificações exigidas e política para resultado inconclusivo.

Não publicar ainda um schema como API estável do pacote 1.0.3. O schema deve ser implementado e testado antes de ser declarado contrato público.

## 5. Pipeline de imagens

### 5.1 Pré-geração

Converter o pedido em uma especificação estruturada. Separar restrições verificáveis (dimensões, formato, quantidade de objetos em uma cena controlada) de preferências estéticas (iluminação, estilo, composição).

Exemplo ilustrativo — não é uma API implementada:

```json
{
  "request_id": "img-exp-001",
  "modality": "image",
  "task": "generate",
  "subject": "industrial_robot_hand",
  "constraints": {
    "visible_digit_count": 5,
    "background": "industrial_datacenter"
  },
  "verification_plan": [
    "object_detection",
    "instance_segmentation",
    "count_estimate",
    "human_review_if_uncertain"
  ]
}
```

### 5.2 Durante a geração

Adaptadores poderão expor recursos específicos do runtime, por exemplo:

- condicionamento espacial (ex.: ControlNet);
- adaptação por LoRA;
- image-to-image;
- máscaras e inpainting;
- parâmetros de sampler/denoising;
- seed e configuração de geração.

Esses recursos são específicos de cada runtime. O VUC deve registrar quais parâmetros foram realmente aplicados; não inferi-los apenas do pedido.

### 5.3 Pós-geração

1. Validar bytes, formato, dimensões e limites de arquivo.
2. Calcular hash do artefato recebido.
3. Executar os verificadores exigidos pela especificação.
4. Registrar método, versão, limiares e resultado de cada verificador.
5. Aplicar a política de aceitação, rejeição ou revisão humana.
6. Vincular artefato e relatório à execução.

Um detector de objetos, segmentador ou modelo de visão é probabilístico. Sua saída pode apoiar uma decisão, mas não constitui automaticamente prova matemática de anatomia, contagem ou topologia. Para propriedades críticas, preferir representação estruturada/CAD e verificadores determinísticos.

### 5.4 Estados de decisão

- `PASS`: todas as verificações obrigatórias aplicáveis foram executadas e passaram.
- `FAIL`: ao menos uma verificação obrigatória falhou.
- `UNKNOWN`: faltam dados, execução ou evidência.
- `REVIEW_REQUIRED`: a política exige revisão humana ou a confiança é insuficiente.

`UNKNOWN` e `REVIEW_REQUIRED` nunca podem ser convertidos silenciosamente em `PASS`. Reamostragem/correção é uma nova tentativa, com novo identificador de tentativa e artefatos preservados.

## 6. Composição, geometria e CAD

Para tarefas de engenharia, separar três representações:

1. **Imagem raster:** evidência visual; pode conter ambiguidades e artefatos.
2. **Representação intermediária:** objetos, instâncias, relações, unidades e coordenadas inferidas.
3. **Modelo CAD/geométrico:** geometria paramétrica ou B-rep com unidades, tolerâncias e restrições explícitas.

O caminho preferencial é validar as propriedades críticas sobre a representação geométrica estruturada, não somente sobre pixels.

Verificações candidatas:

- contagem de entidades e componentes;
- unidades e dimensões;
- bounding box, volume e área;
- conectividade e número de sólidos;
- colisões e interferências;
- tolerâncias e restrições paramétricas;
- integridade de exportação/importação STEP;
- consistência de desenho/documentação TechDraw.

FreeCAD, STEP, TechDraw e MCP são integrações candidatas. Sua disponibilidade e execução precisam ser demonstradas por workflow e artefatos próprios antes de qualquer claim de suporte de produção.

## 7. Evidência e ExecutionProof

A evolução multimodal deve reutilizar os princípios de evidência existentes, sem alterar retroativamente o contrato atual.

Um registro futuro poderá vincular:

- request/specification hash;
- runtime, provider, model ID e revisão;
- parâmetros efetivamente aplicados;
- hashes de inputs e outputs;
- timestamps e identificadores de execução/tentativa;
- verificadores, versões, métricas e decisões;
- relatório de validação e seu hash;
- identidade/chave de assinatura e assinatura, quando disponíveis.

### Limites de prova

| Evidência | Claim permitido |
|---|---|
| Hash do arquivo | Os bytes correspondem ao digest registrado |
| Assinatura válida | O conteúdo assinado foi autenticado sob a chave correspondente |
| Log/ID de execução | Há um registro da execução, sujeito à confiança do emissor |
| Relatório do verificador | O verificador identificado reportou o resultado registrado |
| Verificação geométrica determinística | As propriedades geométricas implementadas e testadas passaram |
| Avaliação neural | O avaliador estimou a propriedade com método/limiar especificados |

Não afirmar que uma assinatura Ed25519 prova qualidade semântica, correção anatômica, ausência de alucinação ou efeito remoto não observado. A versão e o schema do ExecutionProof devem evoluir por compatibilidade explícita, não por mudança silenciosa no 1.0.3.

## 8. Segurança e privacidade

A implementação futura deverá cobrir:

- autenticação e autorização por modalidade/provedor;
- gestão de segredos sem persistência em logs;
- allowlist de endpoints e mitigação de SSRF/redirecionamento em runtimes remotos;
- limites de tamanho, tempo, custo, concorrência e memória;
- validação de MIME real e conteúdo, não apenas extensão;
- proteção contra prompt injection em conteúdo recuperado e metadados;
- isolamento de arquivos e diretórios temporários;
- política de retenção, consentimento e remoção de imagens;
- provenance de pesos/modelos, licenças e revisão de dependências;
- sanitização de nomes, caminhos e metadados de artefatos.

Nenhum endpoint remoto, chave ou serviço de geração deve ser habilitado implicitamente pela documentação.

## 9. Roadmap e gates

### Gate A — VUC 1.0.3 (estabilização)

- auditoria de segurança, contratos, CLI, MCP, conectores, pacote npm e workflows;
- resolução dos bloqueadores de severidade alta/crítica;
- testes sobre o tarball instalado em ambiente limpo;
- cobertura mensurada, com escopo e thresholds explícitos;
- compatibilidade e regressão;
- documentação refletindo somente evidência observada.

### Gate B — Especificação multimodal (documentação)

- arquitetura e fronteiras descritas;
- contratos propostos e estados definidos;
- threat model e privacidade documentados;
- critérios de compatibilidade e não regressão aprovados.

### Gate C — Implementação posterior

- adaptador inicial de texto/imagem;
- artefato e hash;
- verificação pós-geração;
- relatório de evidências;
- testes positivos, negativos e inconclusivos;
- CI separado e sem bloquear/alterar o caminho estável até ser formalmente integrado.

### Gate D — Promoção

Só promover capacidade após implementação, testes, execução real em ambiente declarado, evidência reproduzível, revisão de segurança e compatibilidade pública.

## 10. Critérios de aceite para a arquitetura

- [ ] Diagrama e responsabilidades revisados.
- [ ] Contrato de geração versionado e validado por schema.
- [ ] Adaptadores têm testes de contrato e estados de indisponibilidade.
- [ ] Imagens têm validação de formato/tamanho/hash.
- [ ] Verificadores reportam método, versão, métrica e limitações.
- [ ] `UNKNOWN`/revisão humana são fail-closed.
- [ ] Execução e verificação têm evidências distintas.
- [ ] Segurança, privacidade e licenciamento revisados.
- [ ] CI multimodal isolado e reprodutível.
- [ ] Nenhuma capacidade é anunciada como implementada antes dos gates.

---

**Regra de produto:** o modelo propõe; o VUC governa a execução; verificadores avaliam claims específicos; a evidência limita o que podemos afirmar.

**VUC 1.0.3 permanece uma release de estabilização. Esta arquitetura é a base documental para uma evolução multimodal posterior, não uma promessa de capacidade já disponível.**
