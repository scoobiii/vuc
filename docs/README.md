# Documentação do VUC

Esta página organiza a documentação por assunto. Os guias canônicos descrevem contratos e caminhos de entrada; documentos históricos continuam acessíveis para preservar links e contexto. Sempre valide alegações de implementação com o código e os testes da versão usada.

## Comece aqui

- [Onboarding](./ONBOARDING.md) — checkout, primeiros comandos e limites operacionais.
- [Arquitetura](./ARCHITECTURE.md) — camadas, conceitos e fluxo de execução governada.
- [CLI](./CLI.md) — comandos, instalação e automação.
- [MCP](./MCP.md) — servidor local, ferramentas e fronteiras de transporte.
- [Connectors e adapters](./CONNECTORS.md) — conceitos, inventário e evidência esperada.
- [Compatibilidade](./COMPATIBILITY.md) — VUC canônico, aliases e nomes históricos.

## Segurança e verificabilidade

- [Modelo de segurança](./SECURITY.md) — threat model, autorização, sandbox e limitações.
- [Evidence e ExecutionProof](./EVIDENCE.md) — hashes, assinatura, verificação e limites de claims.
- [Glossário](./GLOSSARY.md) — definições curtas dos termos do projeto.
- [Manual histórico de segurança](./MANUAL-DE-SEGURANCA.md) — material legado a interpretar junto do modelo canônico.
- [OAuth 2.1 e tenant security gate](./OAUTH21-TENANT-SECURITY-GATE.md) — especificação detalhada e limites do gate.

## Operação e qualidade

- [Testes](./TESTING.md) — comandos e orientação de validação.
- [CI como fonte de verdade](./CI-STATUS.md) — significado dos gates e estado do workflow.
- [Certifiable Assurance Tests](./CERTIFIABLE_ASSURANCE_TESTS.md) — famílias de testes de controle; não equivale a certificação externa.
- [Onboarding operacional](./ONBOARDING.md) — instalação, MCP e matriz K6.

## Produto e evolução

- [Status do produto (registro datado)](./PRODUCT-STATUS-2026-09-17.md) — snapshot histórico, não status automaticamente atualizado.
- [Produto e operação comercial](./PRODUCT-AGENT-COMMERCE.md) — estratégia e proposta.
- [Backlog](./BACKLOG.md) — evolução planejada.

## Integrações e deep dives existentes

- [Mobile APK](./ANDROID-APK.md)
- [Linux Native CLI Status](./LINUX-NATIVE-CLI-STATUS.md)
- [Termux e GPU](./TERMUX-GPU.md)
- [Performance matrix](./PERFORMANCE_MATRIX.md)
- [Bend 2 + VUC + DREX](./BEND2-VUA-DREX.md)
- [Benchmark Bend/DREX](./BENCHMARK-BEND-VUA.md)
- [Catálogo histórico de conectores](./07-conectores-e-adaptadores.md)
- [Adapters locais versus GitHub remoto](./05-adapters-local-vs-github-remoto.md)
- [Runtime histórico](./RUNTIME.md)

## Regras de leitura

- **Código existente não prova que foi executado.**
- **Execução local não prova, por si só, um efeito externo.**
- **Assinatura válida prova integridade sob uma chave, não veracidade factual.**
- `UNKNOWN` não deve ser convertido silenciosamente em `PASS`.
- O nome canônico é **VUC**; nomes históricos são tratados em [Compatibilidade](./COMPATIBILITY.md).
