# Verificação ParametrIX no VUC

`verify-vuc-proof.mjs` valida independentemente a assinatura Ed25519 no certificado gerado pelo ParametrIX. A mensagem assinada é exatamente `hash_input:hash_output:hash_processo`; não há aceitação de campos ausentes nem de assinatura inválida.

```bash
node integrations/parametrix/verify-vuc-proof.mjs ../parametrIX/proof/vuc-latest.json
```

O workflow `.github/workflows/parametrix-proof.yml` baixa o repositório público `scoobiii/parametrIX` e verifica o artefato selecionado em um runner Ubuntu. Isso prova a assinatura; não prova que CAD, Qwen ou hardware externo estejam disponíveis sem seus próprios testes de integração.
