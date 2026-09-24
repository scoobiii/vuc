# VUC — Produto, Conectores e Operação Agent-to-Agent

**Responsável:** GoS3  
**Projeto:** VUC — Vortex Universal Connector  
**Versão:** 1.0  
**Status:** Arquitetura comercial e operacional proposta

## 1. Princípio de produto

O VUC é uma camada de execução governada para aplicações de IA e agentes.

O modelo comercial não começa pela quantidade de modelos suportados. Começa pela capacidade de transformar uma intenção de agente em uma ação autorizada, delimitada, executada e verificável:

```
AI App / LLM
     ↓ MCP
VUC
     ↓
Identity + Tenant + Capability + Policy
     ↓
Connector
     ↓
Real Execution
     ↓
ExecutionProof
     ↓
Independent Verification
```

**Regra:** sem evidência verificável, o VUC não declara execução válida.

## 2. Compatibilidade por camadas

O primeiro host de referência é GPT. O runtime, porém, deve permanecer host/model agnostic sempre que o cliente oferecer MCP ou outro contrato suportado.

A expansão segue:

1. GPT / primeiro host de referência;
2. demais hosts LLM compatíveis;
3. agentes corporativos;
4. aplicações empresariais;
5. catálogo de conectores.

O VUC não vende um modelo de IA. Vende uma fronteira governada para o modelo/agente agir.

## 3. VUC Connect

Conectores são integrações, não produtos independentes.

Categorias:

- Big Tech / cloud;
- SaaS corporativo;
- ERP;
- CRM;
- ITSM;
- dados;
- observabilidade;
- developer platforms;
- sistemas internos do cliente.

Cada connector deve declarar:

- identidade do provider;
- capabilities;
- scopes;
- tenant binding;
- efeitos externos;
- credenciais exigidas;
- política de autorização;
- ExecutionProof produzido;
- método independente de verificação;
- estado de certificação.

### Estados

```
DISCOVERY → INTEGRATION → GOVERNED → CERTIFIED
```

Nenhum connector deve ser apresentado como certificado apenas porque responde a uma chamada MCP.

## 4. Operação agent-to-agent

A Vortex pode operar como uma organização em que o relacionamento operacional primário é entre agentes.

```
Cliente
  ↓
Agente Vortex
  ↓
Onboarding Agent
  ↓
Discovery / Audit Agent
  ↓
Solution Agent
  ↓
VUC
  ↓
CRM / ERP / Cloud / Data connectors
```

Agentes humanizados são uma interface operacional; não devem receber autoridade implícita.

Toda ação externa continua sujeita a:

- identidade;
- tenant;
- capability;
- policy;
- approval quando exigido;
- execução real;
- ExecutionProof;
- auditoria.

## 5. Primeiro agente adquirido pelo cliente

O primeiro produto comercial pode ser um **Onboarding & Discovery Agent**.

Objetivo: mapear o ambiente do cliente e transformar evidência operacional em uma demanda estruturada.

Fluxo:

```
Onboarding
   ↓
Discovery
   ↓
Audit
   ↓
Pain Map
   ↓
Demand
   ↓
Solution Candidate
   ↓
CAPEX / OPEX
   ↓
ROI / TCO
   ↓
Proposal
```

O agente não deve inventar dor, ROI ou necessidade de investimento.

Cada conclusão deve carregar:

- fonte;
- evidência;
- timestamp;
- tenant;
- hipótese versus fato;
- premissas financeiras;
- confiança/limitações;
- ExecutionProof quando houver ação executada.

## 6. CRM e ERP

A integração com CRM/ERP é uma fase de produto, não um bypass da governança.

Exemplos de operações:

- consultar cadastro;
- registrar diagnóstico;
- criar oportunidade;
- atualizar estágio;
- registrar demanda;
- anexar evidência;
- consultar dados autorizados de ERP;
- estruturar CAPEX/OPEX;
- registrar proposta.

Operações de escrita devem exigir capability explícita e produzir evidência verificável.

## 7. GAIS

GAIS — Governance AI System — fica acima do runtime.

```
GAIS
  ↓ decide / orquestra
VUA
  ↓ governs
VUC
  ↓ executes
Connector
  ↓ acts
Provider
```

**GAIS decide/orquestra. VUC impõe/enforce.**

Ativação GAIS em produção permanece planejada até haver:

- autenticação e autorização de produção;
- isolamento por tenant;
- custódia corporativa de chaves;
- observabilidade;
- evaluators contínuos;
- threat model;
- rollback;
- testes de integração dos providers;
- evidência operacional repetível.

## 8. Custódia criptográfica

Próximo estágio:

- chaves Ed25519 corporativas;
- KMS/HSM;
- rotação;
- versionamento de key IDs;
- revogação;
- política de uso;
- auditoria de assinatura;
- recuperação operacional.

A chave privada nunca deve ser incorporada ao frontend, connector, APK ou documentação.

## 9. Distribuição

Alvos de produção:

- pacote Node/npm quando aplicável;
- binário autônomo;
- imagem Alpine minimalista;
- SBOM;
- assinatura de artefato;
- scan de vulnerabilidades;
- provenance;
- reprodução de build quando possível.

## 10. Métricas comerciais

Não confundir métricas de engenharia com métricas comerciais.

### Produto

- connectors certificados;
- tenants;
- agentes;
- execuções governadas;
- ExecutionProofs;
- execuções bloqueadas;
- taxa de proof coverage.

### Negócio

- clientes pagantes;
- ARR/MRR;
- receita por tenant;
- receita por execução;
- retenção;
- expansão;
- margem;
- pipeline;
- CAC/LTV quando houver dados suficientes.

## 11. Monetização

Modelo inicial:

```
Platform fee
+
Connector / integration tier
+
Governed execution
+
Proof verification
+
Enterprise controls
```

A unidade de consumo preferencial é **governed execution**, não simplesmente número de usuários humanos.

## 12. Roadmap para GA

### Agora — fechar o núcleo

```
MCP
 ↓
real connector
 ↓
real execution
 ↓
ExecutionProof
 ↓
Ed25519
 ↓
independent verifier
```

### Depois

- primeiro connector cloud;
- primeiro host GPT;
- catálogo de connectors;
- tenant comercial;
- onboarding agent;
- CRM/ERP governados;
- GAIS;
- KMS/HSM;
- distribuição final.

## 13. Comunicação

A landing page VortexCorp deve ser observabilidade e produto, não fonte de autoridade.

Ela pode consumir somente sinais públicos verificáveis:

- CI;
- ExecutionProof;
- assinatura;
- hash;
- identidade;
- estado do connector.

Nunca deve transformar ausência de evidência em PASS.

## 14. Automação social

Automação de publicação deve ser separada da governança de execução.

Pipeline proposto:

```
Approved Content
   ↓
Content Agent
   ↓
Policy Check
   ↓
Human Approval, when required
   ↓
Bsky / X Publisher
   ↓
Publication Receipt
   ↓
Evidence
```

Nenhuma credencial social deve ser armazenada no frontend ou no repositório.

## 15. Critério de produção

O VUC só deve mudar de **🟡 Planejado** para **🟢 GA** quando houver evidência dos gates técnicos e operacionais correspondentes.

**5/5 adversarial PASS e o gate MCP/ExecutionProof são evidências de engenharia; não são, sozinhos, evidência de GA comercial.**

---

**Assinatura:** GoS3
