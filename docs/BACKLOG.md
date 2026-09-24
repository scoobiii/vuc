# 📋 VUC Master Backlog & Matriz de Evolução Contínua

Este documento consolida o **Backlog Dinâmico do VUC (Vortex Universal Connector)**, mapeando o histórico dos sprints executados, as capacidades ativas no estado atual e as entregas prioritárias rumo à produção.

---

## 🔄 Fluxo de Transição Dinâmica Orientado a CI/PR

O status de cada item do backlog é vinculado ao pipeline de integração contínua (CI) e às provas criptográficas:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌───────────────┐
│   BACKLOG   │ ──► │ EM PROGRESSO │ ──► │  PR SUBMETIDO    │ ──► │ PÓS-MERGE TESTADO │ ──► │ CONCLUÍDO (GA)│
│  (Definido) │     │   (Branch)   │     │ (16/16 CI Gates) │     │ (E2E & Zero-Leak) │     │  (Verificado) │
└─────────────┘     └──────────────┘     └──────────────────┘     └───────────────────┘     └───────────────┘
```

1. **Submissão de PR (`create_pr_written`)**: Dispara a execução dos 16 Quality Gates.
2. **Validação de CI (`npm test`)**: Todos os gates (RFC 8785, GOS3, Canary, Patch Arena, Performance `PASS_SUPERIOR`, Caos e Estresse) devem atingir 100% de aprovação.
3. **Merge Seguro Governamental (`merge_pr`)**: Emite a Prova de Execução Ed25519 (`vortex-execution-evidence/v1`).
4. **Testes Pós-Merge**: Executa a suíte de paridade DREX e auditoria zero-mock, atualizando o livro-razão no Firestore e SQLite.

---

## 📊 Matriz Detalhada do Backlog por Sprint

### 1º SPRINT — Fundação, Núcleo Criptográfico & Isolamento (Concluído: 100%)

| ID | Épico / Capacidade | Descrição Técnica & Critérios de Aceite | Prova de Verificação | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SPR1-01** | Canonicalização RFC 8785 | Implementação pura de JSON Canonicalization Scheme (JCS) em TypeScript com ordenação léxica e codificação UTF-8 determinística. | `tests/unit.test.ts` (Gate 1) | ✅ Concluído |
| **SPR1-02** | Criptografia Ed25519 | Assinatura e verificação assimétrica de provas de execução com vinculação de identidade do principal e chave pública. | `RFC 8785 + Ed25519 Engine` | ✅ Concluído |
| **SPR1-03** | Motor Antifraude Adversarial | 5 cenários ativos de mitigação: FORGE (adulteração de hash), REPLAY (ataque de repetição), ESCALATE (elevação de privilégio), ESCAPE (path traversal) e TAMPER. | `tests/security.test.ts` (Gate 4) | ✅ Concluído |
| **SPR1-04** | Sandbox & Contrato GOS3 | Isolamento estrito de filesystem, limites de memória/CPU e controle de chamadas destrutivas com aprovação vinculada. | `GOS3SandboxManager.ts` | ✅ Concluído |

---

### ONDE ESTAMOS — Governança, DREX, Tri-Sync & Multi-Ambiente (Estado Atual)

| ID | Épico / Capacidade | Descrição Técnica & Critérios de Aceite | Prova de Verificação | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SPR2-01** | MCP Workbench | Servidor canônico Model Context Protocol (`bin/mcp-server.js`) expondo ferramentas `vortex.*` e auditoria de chamadas. | `bin/mcp-server.js` | 🟢 Ativo |
| **SPR2-02** | Multi-LLM Gateway | Catálogo federado (`vua-llms.json`) com resolução de roteamento offline/online entre Gemini, OpenAI e Ollama local. | `vua-llm-resolve.ts` | 🟢 Ativo |
| **SPR2-03** | GitHub Seguro & Ciclo Git | Tokens voláteis em memória, commits governados em branch, emissão de PR e merge auditado via `octokit` seguro. | `GitHubRepoManager.tsx` | 🟢 Ativo |
| **SPR2-04** | 16 Quality Gates no CI | Pipeline automatizado que valida integridade, throughput > 900 req/s, benchmark `PASS_SUPERIOR` e zero mocks em caminhos críticos. | `scripts/run-full-suite.ts` | 🟢 Ativo (16/16 PASS) |
| **SPR2-05** | Integração DREX & Bend 2.0.25 | Contratos formais de DvP de Energia (MWh), TPFt e Real Digital executando nativamente em Bend 2.0.25 (HVM2) com paridade matemática. | `tests/drex-bend-parity.test.ts` | 🟢 Ativo |
| **SPR2-06** | Persistência Híbrida Tri-Sync | Sincronização contínua: Cloud SQL (PostgreSQL 16) + Firestore (us-west2 Enterprise) + SQLite Local (`vua_local.sqlite`). | `unified-storage.ts` | 🟢 Ativo |
| **SPR2-07** | Resiliência "Sempre no Ar" | Fallback automático instantâneo (0ms downtime) para o SQLite local caso a API Key ou serviços em nuvem falhem. | `/api/vuc/tri-sync/status` | 🟢 Ativo |
| **SPR2-08** | Downloads Sincronizados | Empacotamento dinâmico no ZIP mobile (`vuc-mobile-suite.zip`) contendo o arquivo `vua_local.sqlite` real e o DDL do Cloud SQL. | `/api/vuc/apk/download` | 🟢 Ativo |
| **SPR2-09** | VUC GitPage Dinâmica | Landing page responsiva mobile-first conectada à intranet do CI em tempo real para telemetria e download de pacotes. | `VUCGitPageLiveView.tsx` | 🟢 Ativo |
| **SPR2-10** | K6 por Indústria (8 Segmentos) | Suíte de testes de carga e estresse com 100% de conformidade nos 8 setores regulados. | `K6IndustryView.tsx` | 🟢 Ativo |

---

### RUMO À PRODUÇÃO — Endurecimento, GAIS & Prontidão Corporativa (Roadmap Final)

| ID | Épico / Capacidade | Descrição Técnica & Critérios de Aceite | Dependência | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PROD-01** | Ativação em Produção do GAIS | Orquestração autônoma do Governance AI System via MCP com verificação estrita de side-effects e telemetria de tokens. | SPR2-01 | 🟡 Planejado |
| **PROD-02** | Custódia e Rotação KMS/HSM | Integração das chaves mestras Ed25519 com Google Cloud KMS / AWS CloudHSM com rotação automática sem parada. | SPR1-02 | 🟡 Planejado |
| **PROD-03** | Auditoria Contínua de Deriva Semântica | Avaliadores autônomos em background comparando embeddings e outputs de LLMs contra a matriz de 30 oráculos semânticos. | SPR2-02 | 🟡 Planejado |
| **PROD-04** | Empacotamento de Distribuição Alpine | Imagem de contêiner minimalista (<25MB) Alpine Linux com hardening de permissões (non-root, read-only rootfs) e binário compilado em CJS/Node. | SPR2-04 | 🟡 Planejado |
| **PROD-05** | Operações Multiregião Cloud SQL | Replicação entre us-west2 e us-east1 com comutação de leitura distribuída e failover geográfico. | SPR2-06 | 🟡 Planejado |

---

## 📈 Histórico de Atualizações do Backlog

* **2026-09-23**: Adição e conclusão do épico **SPR2-06 (Tri-Sync)**, **SPR2-07 (Resiliência SQLite Sempre no Ar)** e **SPR2-08 (Downloads Sincronizados)**.
* **2026-09-23**: Validação de 100% de aprovação nos 16 Quality Gates do CI pós-merge.
* **2026-09-23**: Sincronização do schema DDL Cloud SQL e banco SQLite local `data/vua_local.sqlite`.
