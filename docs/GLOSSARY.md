# VUC — Glossário de Governança, Execução e Conectores

**Versão:** 1.0  
**Escopo:** VUC / Vortex / MCP / ExecutionProof / conectores / governança  
**Status:** referência normativa de terminologia  
**Responsável:** GoS3 / Vortex Open Protocol Foundation

> Este glossário define o significado dos termos usados no código e na documentação do VUC. Quando um termo técnico possuir significado mais amplo no mercado, a definição abaixo prevalece **dentro do projeto**, salvo indicação explícita em contrário.

---

## 1. Núcleo da arquitetura

| Termo | Definição normativa |
|---|---|
| **Vortex** | Família de componentes e princípios de verificação, governança e prova que envolve o VUC. Não é sinônimo de um único processo de execução. |
| **VUC** | **Vortex Universal Connector / Governed Execution Runtime**. Camada que recebe uma solicitação de um agente/host, aplica identidade, tenant, capability, policy e sandbox, aciona o conector apropriado e produz evidência verificável quando a operação exige prova. |
| **VUA** | **Vortex Universal Adapter/Connector**. Terminologia histórica e de compatibilidade usada no projeto. O VUC é o nome atual do runtime/produto; referências legadas a VUA devem ser interpretadas conforme o contexto. |
| **VGPT** | **Vortex GPT Connector**. Perfil/entry point MCP voltado a hosts GPT/ChatGPT. Não é um segundo runtime: encaminha a interação para a fronteira de governança do VUC. |
| **GAIS** | **Governance AI System**. Camada de inteligência/orquestração que pode decidir, planejar ou coordenar operações. A autorização e o enforcement de execução permanecem no VUC. |
| **Agent / Agente** | Software que produz objetivos, solicita operações ou consome ferramentas em nome de um usuário ou sistema. Um agente não recebe autoridade implícita apenas por ser um agente. |
| **LLM** | **Large Language Model**. Modelo que pode gerar linguagem/código/decisões para um agente. O VUC não depende de um LLM específico; a integração exige uma interface compatível, como MCP ou outra interface suportada. |
| **AI Host** | Aplicação que hospeda o modelo/agente e fornece contexto, ferramentas e transporte. Pode ser um produto de IA, IDE ou runtime de agentes. |
| **Execution Boundary** | Fronteira na qual uma intenção deixa de ser apenas proposta e passa a ser uma operação sujeita a identidade, autorização, isolamento, execução e evidência. |

---

## 2. Governança

| Termo | Definição normativa |
|---|---|
| **Identity** | Identidade autenticada associada ao principal que solicita uma operação. Autenticação identifica; não concede automaticamente autorização. |
| **Principal** | Entidade autenticada que atua no sistema: usuário, agente, serviço ou cliente autorizado. |
| **Tenant** | Domínio lógico de isolamento que separa recursos, identidades, credenciais, políticas e operações de um cliente/organização. |
| **Tenant Binding** | Regra que associa uma requisição, token, identidade e operação a um tenant determinado e impede uso cross-tenant não autorizado. |
| **Tenant Provisioning** | Processo pelo qual um tenant passa a ser aceito pelo runtime. No estado atual, o allowlist de tenants é uma barreira de provisionamento; não substitui um IdP corporativo. |
| **Capability** | Permissão semântica para realizar uma classe específica de ação, por exemplo `repository.create` ou `git.write`. |
| **Scope** | Escopo de autorização associado a uma credencial/token, como `mcp:read` ou `mcp:write`. Scope não substitui capability policy. |
| **Policy** | Conjunto de regras que determina se uma operação solicitada é permitida, negada ou exige condições adicionais. |
| **Approval** | Autorização explícita adicional exigida para determinadas operações de maior risco. |
| **RBAC** | **Role-Based Access Control**. Controle de acesso baseado em papéis, que pode complementar scopes e capabilities. |
| **Least Privilege** | Princípio de conceder somente as permissões necessárias para a operação solicitada. |
| **Fail-Closed** | Comportamento no qual ausência, inconsistência ou invalidez de uma condição obrigatória resulta em negação, e não em fallback permissivo. |
| **Zero Leakage** | Princípio de impedir exposição indevida de credenciais, tokens, secrets ou material sensível em logs, provas, respostas ou contexto do modelo. |
| **GOS3** | Conjunto de princípios/regras de governança usados pelo projeto para delimitar execução, autorização, evidência e auditoria. Não deve ser tratado como certificação externa. |

---

## 3. Execução e isolamento

| Termo | Definição normativa |
|---|---|
| **Connector** | Componente que traduz uma capability governada em uma interação com um sistema ou superfície real, por exemplo Git, GitHub, ERP ou API. |
| **Adapter** | Implementação técnica de uma integração/superfície. O adapter sabe **como** executar; o VUC decide **se** a execução pode ocorrer. |
| **Adapter Contract** | Contrato esperado de um adapter, incluindo descoberta/manifesto, capabilities, validação, execução, health e evidência conforme a integração. |
| **Execution** | Operação efetivamente processada pelo runtime. Uma resposta de sucesso sintética não deve ser confundida com efeito externo real. |
| **Real Execution** | Execução que realmente invoca o sistema-alvo e cuja ocorrência pode ser corroborada pela resposta/evidência da integração. |
| **External Effect** | Efeito observável fora do processo do VUC, como criar um repositório, gravar um commit ou modificar um recurso remoto. |
| **Local-Only Effect** | Operação cujo efeito permanece no ambiente local controlado pelo runtime. |
| **Remote-Confirmed Effect** | Operação remota cuja resposta do sistema-alvo confirma o efeito ou a leitura remota correspondente, conforme o contrato do adapter. |
| **Sandbox** | Limite técnico aplicado à execução para restringir recursos, caminhos, processos, rede ou outras superfícies de efeito. |
| **Network Scope** | Lista/restrição de destinos de rede autorizados para determinada execução. |
| **Path Traversal** | Tentativa de escapar do escopo de caminhos autorizado por meio de segmentos como `../`. É tratada como violação de sandbox. |
| **Mock** | Implementação simulada usada para substituir uma integração/execução real. Mocks podem ser úteis em testes unitários, mas não constituem evidência de efeito externo real. |
| **mock-sig** | Assinatura/prova sintética que não representa uma execução real. O VUC deve rejeitar esse padrão como evidência válida de execução. |
| **Synthetic Success** | Resultado artificialmente produzido pelo software sem comprovar que o efeito externo correspondente ocorreu. Não equivale a Real Execution. |

---

## 4. ExecutionProof e criptografia

| Termo | Definição normativa |
|---|---|
| **ExecutionProof** | Estrutura assinada que registra evidências da operação governada, incluindo identidade, contexto, hashes e estado de execução, permitindo verificação independente. |
| **Proof of Execution** | Evidência criptográfica e contextual de que uma operação passou pelo caminho de execução especificado. Não significa, isoladamente, que a operação era segura ou autorizada. |
| **Proof of Safety** | Não é sinônimo de ExecutionProof. Segurança depende também de autorização, limites, identidade, isolamento e accountability. |
| **Ed25519** | Algoritmo de assinatura digital usado pelo VUC para autenticar provas. |
| **JCS** | **JSON Canonicalization Scheme**. Procedimento de canonicalização determinística de JSON. |
| **RFC 8785** | RFC que especifica o JCS. No VUC, a canonicalização permite que o mesmo conteúdo produza uma representação determinística para hashing/assinatura. |
| **Canonicalization** | Transformação determinística de uma estrutura para uma representação única antes de hashing/assinatura. |
| **SHA-256** | Função hash criptográfica usada para digests de dados/provas e integridade de conteúdo. |
| **Input Hash** | Digest do input relevante da operação. |
| **Output Hash** | Digest do output relevante da operação. |
| **Proof Hash** | Digest canônico associado à própria estrutura de prova. |
| **Signature** | Assinatura criptográfica que permite verificar autenticidade/integridade da estrutura assinada. |
| **Key ID** | Identificador lógico da chave usada para assinar/verificar uma prova. |
| **Independent Verification** | Verificação realizada por componente capaz de validar a prova sem simplesmente confiar no resultado textual do executor. |
| **VERIFIED** | Estado no qual a verificação independente aceitou a prova e seus checks obrigatórios. Não significa que toda propriedade operacional externa foi auditada. |
| **executed** | Campo que indica se a operação foi efetivamente executada segundo o contrato do runtime. Em uma negação governada, deve permanecer `false`. |
| **external_effect** | Classificação do efeito externo associado à operação, quando aplicável. |

---

## 5. MCP e integração com hosts de IA

| Termo | Definição normativa |
|---|---|
| **MCP** | **Model Context Protocol**. Protocolo usado para expor ferramentas/contexto a hosts de modelos e agentes. |
| **MCP Server** | Serviço que implementa a interface MCP e expõe ferramentas/recursos para um MCP client/host. |
| **MCP Client** | Componente que se conecta a um MCP server para descobrir e invocar ferramentas. |
| **Tool** | Operação exposta por MCP que pode ser descoberta e invocada por um agente/host. |
| **tools/list** | Operação MCP usada para descoberta das ferramentas disponíveis. |
| **tools/call** | Operação MCP usada para solicitar a execução de uma ferramenta. |
| **Streamable HTTP** | Transporte HTTP usado pelo perfil remoto MCP do VUC/VGPT quando aplicável. |
| **Remote MCP** | MCP exposto por um endpoint remoto, normalmente protegido por TLS e autenticação/autorização adequadas. |
| **OAuth 2.1** | Modelo de autorização utilizado para proteger integrações remotas. No VUC, deve ser combinado com tenant binding, scopes e policy. |
| **PKCE S256** | Mecanismo de proteção para authorization code flow que usa Proof Key for Code Exchange com SHA-256. |
| **Protected Resource Metadata** | Metadados que informam como um cliente deve obter autorização para acessar um recurso protegido. |
| **Authorization Server Metadata** | Metadados do servidor de autorização, incluindo endpoints e capacidades relevantes. |
| **Dynamic Client Registration** | Processo de registro de clientes OAuth. No VUC, registro válido não significa que qualquer tenant arbitrário esteja provisionado. |
| **VGPT Connector Profile** | Descrição machine-readable do entry point MCP do VUC destinado a hosts GPT/ChatGPT, incluindo transporte, OAuth, scopes, governança e requisito de ExecutionProof. |
| **live_connection_verified** | Indicador explícito do perfil VGPT. `false` significa que o repositório não está alegando uma conexão externa ao ChatGPT como fato verificado. |

---

## 6. Git, cloud e efeitos remotos

| Termo | Definição normativa |
|---|---|
| **Git Adapter** | Adapter que executa comandos Git nativos com argv explícito e sem shell para as operações suportadas. |
| **GitHub Adapter** | Adapter que interage com a API real do GitHub sob as regras de governança do VUC. |
| **Porcelain** | Comandos Git orientados ao usuário, como `status`, `add` e `commit`. |
| **Plumbing** | Comandos Git de baixo nível usados para manipulação/inspeção interna do repositório. |
| **Remote Repository** | Repositório Git hospedado em serviço remoto, como GitHub. |
| **Cloud Execution** | Execução que alcança um serviço remoto/cloud real através de um connector. |
| **Credential** | Material ou referência de autenticação/autorização usado para acessar um sistema externo. |
| **Secret** | Informação confidencial que não deve ser exposta ao modelo, logs ou artefatos públicos. |
| **PAT** | **Personal Access Token**. Credencial de acesso pessoal a uma plataforma, como GitHub. |
| **KMS/HSM** | Sistemas para custódia/uso protegido de chaves criptográficas. O suporte operacional completo a KMS/HSM é um gate separado da simples existência de Ed25519 no código. |

---

## 7. Evidência, auditoria e CI

| Termo | Definição normativa |
|---|---|
| **Evidence** | Dados usados para demonstrar o que ocorreu, sob quais condições e com qual integridade. |
| **Execution Evidence** | Evidência específica da execução, normalmente vinculada a uma ExecutionProof. |
| **Audit Trail** | Registro cronológico e verificável de eventos relevantes para investigação e accountability. |
| **Provenance** | Metadados que identificam origem da execução/evidência, como commit, workflow, run ID e attempt. Provenance fabricada é inválida para evidência de produção. |
| **CI** | **Continuous Integration**. Pipeline automatizado que valida o estado do código. |
| **Quality Gate** | Condição automatizada que precisa ser satisfeita para aceitar determinada etapa do pipeline. |
| **Conformance** | Verificação de aderência a um contrato técnico/normativo definido pelo projeto. |
| **Adversarial Test** | Teste que tenta violar ou contornar uma propriedade de segurança/governança. |
| **Regression Test** | Teste que garante que uma propriedade anteriormente validada não foi quebrada por uma alteração. |
| **Failing Closed Gate** | Quality gate que bloqueia a progressão quando evidência obrigatória está ausente ou inválida. |
| **Benchmark Baseline** | Referência quantitativa usada para comparar desempenho dentro de uma classe de ambiente definida. Não deve misturar baseline física com benchmark de container/cloud sem normalização explícita. |

---

## 8. Segurança: ataques e controles

| Termo | Definição |
|---|---|
| **FORGE** | Cenário adversarial de falsificação/adulteração de campos de uma prova. |
| **REPLAY** | Reutilização indevida de uma solicitação/prova já processada quando o contrato exige unicidade. |
| **ESCALATE** | Tentativa de obter capacidade, scope ou efeito superior ao autorizado. |
| **ESCAPE** | Tentativa de escapar dos limites de sandbox, especialmente por path/network boundary. |
| **TAMPER** | Adulteração posterior de dados/artefatos detectável por integridade criptográfica. |
| **Anti-Replay** | Mecanismo que impede processamento indevido de uma mesma operação/request em contexto no qual unicidade é obrigatória. |
| **Cross-Tenant** | Acesso ou uso de credenciais/dados/recursos de outro tenant sem autorização. |
| **Credential Isolation** | Separação das credenciais por tenant, principal, ambiente ou integração, conforme o modelo de segurança adotado. |

---

## 9. Termos de produto e operação

| Termo | Definição |
|---|---|
| **VUC Core** | Núcleo comercial/arquitetural: runtime, identidade, tenant, capabilities, sandbox e ExecutionProof. |
| **VUC Connect** | Camada/catálogo de connectors governados. Connector é uma integração do produto, não necessariamente um produto independente. |
| **VUC Enterprise** | Camada prevista para controles corporativos como SSO, RBAC, políticas, auditoria e custódia de chaves. |
| **VUC Verify** | Conceito de verificação independente de ExecutionProof. |
| **Connector Lifecycle** | Ciclo de maturidade de integração: `DISCOVERY → INTEGRATION → GOVERNED → CERTIFIED`. |
| **Certified Connector** | Connector que cumpriu os critérios de certificação definidos pelo VUC. Certificação interna não equivale a certificação regulatória ou de terceiro. |
| **Onboarding & Discovery Agent** | Agente comercial/operacional concebido para conduzir onboarding, discovery, auditoria, mapa de dores, demanda, solução e análise econômica sem inventar fatos ou ROI. |
| **Agent-to-Agent** | Interação entre agentes ou sistemas agentivos. A comunicação entre agentes não elimina as fronteiras de autorização do VUC. |
| **External Production Readiness** | Estado que exige mais que testes de código: inclui identidade externa, secrets, isolamento multi-tenant, observabilidade, HA/recovery, endpoint remoto, integração real e evidência operacional. |
| **GA / General Availability** | Disponibilidade geral para uso de clientes segundo critérios de produto/operação definidos. Não deve ser inferida apenas de CI verde. |

---

## 10. Termos que não devem ser confundidos

### VUC × VUA

**VUC** é o nome atual do runtime/produto de execução governada. **VUA** aparece como terminologia histórica, compatibilidade e nomenclatura de adapters/conectores.

### Connector × Adapter

Um **connector** é a integração conceitual/produto com um sistema ou superfície. Um **adapter** é a implementação técnica que executa essa integração.

### Scope × Capability

**Scope** limita o que uma credencial/token pode solicitar. **Capability** descreve a ação que o runtime reconhece e governa. Uma não deve ser usada como substituta automática da outra.

### Authentication × Authorization

**Authentication** responde “quem é?”. **Authorization** responde “o que esse principal pode fazer?”. Tenant provisioning adiciona a pergunta “esse tenant está habilitado?”.

### ExecutionProof × Proof of Safety

**ExecutionProof** comprova propriedades da execução/evidência conforme seu contrato. Não prova, sozinho, que a ação era segura, desejável ou correta.

### Real Execution × Synthetic Success

Uma resposta `success` não basta para provar efeito externo. **Real Execution** requer que o caminho de execução tenha atingido o sistema-alvo segundo o contrato do adapter.

### CI PASS × Production Ready

CI verde demonstra que os gates automatizados passaram naquele contexto. **Production Ready** exige também gates operacionais e externos que não podem ser simulados pelo pipeline local.

### VGPT × VUC

**VGPT** é o entry point/perfil MCP para hosts GPT/ChatGPT. **VUC** é a camada que governa e executa as operações.

### GAIS × VUC

**GAIS** pode decidir/orquestrar. **VUC** impõe a fronteira de execução e governança.

### Mock × Test Double

Um test double pode ser apropriado para um teste isolado. O problema surge quando um mock é apresentado como evidência de que uma integração externa realmente ocorreu.

---

## 11. Regra operacional de linguagem

Para documentação, testes, PRs e relatórios:

1. Use **“real execution”** somente quando houver execução real comprovada pelo adapter.
2. Use **“remote-confirmed”** somente quando a integração remota fornecer evidência compatível com o contrato.
3. Não use **“production ready”** como sinônimo de “CI verde”.
4. Não use **“ChatGPT connected”** enquanto uma conexão externa real não tiver sido configurada, invocada e verificada.
5. Não use **“certified”** para significar apenas “testado”.
6. Não trate **tenant allowlist** como substituto de autenticação corporativa/IdP.
7. Não trate **ExecutionProof** como prova de segurança total.
8. Não apresente benchmark de um ambiente como baseline de outro ambiente sem contrato de comparação.
9. Diferencie sempre **fact**, **hypothesis**, **claim**, **evidence** e **limitation** em documentação comercial e de auditoria.
10. Quando houver dúvida semântica, prefira o significado mais restritivo e verificável.

---

## 12. Referências internas

- [ONBOARDING](./ONBOARDING.md)
- [MCP → GPT Cloud](./MCP-GPT-CLOUD.md)
- [VGPT Connector](./VGPT-CONNECTOR.md)
- [Product & Agent Commerce](./PRODUCT-AGENT-COMMERCE.md)
- [Testing](./TESTING.md)
- [Baseline / Governance](./governance/BASELINE-TOLERANCE-REPORT.md)
- [Adapters](./05-adapters-local-vs-github-remoto.md)

**Princípio central:** o glossário não cria capacidade técnica. Ele cria uma linguagem comum para que código, testes, CI, auditoria, produto e comunicação comercial descrevam exatamente a mesma fronteira de execução.
