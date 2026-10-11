# Relatório Formal do Achado S0 — Âncora de Confiança Controlada pelo Chamador (`embeddedPublicKey`)

**Status:** `ENCERRADO / CORRIGIDO (VERIFICADO POR TESTES DE ACEITAÇÃO)`  
**Severidade:** `S0 (Crítica — Fronteira de Autorização e Verificação Criptográfica)`  
**Componentes Afetados:** `src/vortex/crypto.ts`, `src/vortex/verifier.ts`, `src/vortex/graph-verifier.ts`, `src/vortex/mcp-server.ts`, `server.ts`, `bin/vua.js`, `bin/vuc.js`

---

## 1. Resumo Executivo e Causa Raiz

### 1.1 Descrição do Problema Original
Antes da correção, a função `resolvePublicKey(keyId, embeddedPublicKey)` em `src/vortex/crypto.ts` priorizava e retornava diretamente qualquer chave pública PEM fornecida pelo chamador por meio de `options.embeddedPublicKey` antes mesmo de consultar o registro de confiança (`KEY_REGISTRY`):

```ts
// Comportamento vulnerável anterior:
if (embeddedPublicKey && embeddedPublicKey.includes('PUBLIC KEY')) {
  return embeddedPublicKey;
}
```

Como consequência:
1. Um atacante podia gerar um par de chaves Ed25519 arbitrário fora do VUC, assinar uma `ExecutionProof` forjada (com `proof_hash` RFC 8785 e assinatura matematicamente consistentes com a chave do atacante) e submeter `{ embeddedPublicKey: attackerPublicKey }` ao verificador.
2. O verificador validava matematicamente a assinatura contra a chave do próprio atacante e emitia `valid: true, status: 'VERIFIED'`.
3. Mesmo quando `key_id` pertencia a uma identidade legítima no `KEY_REGISTRY`, o envio de `embeddedPublicKey` pelo chamador sobrescrevia a chave legítima registrada (ataque de substituição de chave).

### 1.2 Evidência Antes vs. Depois da Correção

| Vetor de Evidência | Antes da Correção | Após a Correção (`tests/s0-trust-anchor.test.ts`) |
| :--- | :--- | :--- |
| `S0_FORGED_ACCEPTED_WITH_CALLER_KEY` | `true` (Vulnerável) | `false` (**Bloqueado / Fail-Closed**) |
| `FORGED_REJECTED_WITHOUT_KEY` | `true` | `true` |
| Substituição de chave em `key_id` legítimo | Aceita (`valid: true`) | Rejeitada (`KEY_ANCHOR_MISMATCH`, `valid: false`) |
| Injeção inline via `proof.identity.public_key` | Ignorada ou aceita se repassada | Rejeitada (`UNTRUSTED_CALLER_KEY`, `valid: false`) |
| Substituição de `proof.signer` no DAG v2 | Aceita (`proof.signer \|\| publicKeyPem`) | Rejeitada (`untrusted signer`, `valid: false`) |

---

## 2. Arquitetura da Correção e Trust Store Independente

1. **Resolução Estrita via Trust Store Independente (`resolveTrustedKeyAnchor` em `src/vortex/crypto.ts`)**:
   - Nenhuma chave pública fornecida pelo chamador (`embeddedPublicKey` ou `proof.identity.public_key`) é aceita como autoridade de verificação por conta própria.
   - O `key_id` da prova deve obrigatoriamente existir na Trust Store independente do verificador (`KEY_REGISTRY` ou âncoras de ambiente `VUC_TRUSTED_PUBLIC_KEY` / `VUC_TRUSTED_KEYS_JSON` ou arquivo pinado pelo operador via `--trusted-key`).
   - Se `key_id` não existir na Trust Store e o chamador fornecer `embeddedPublicKey`, a resolução falha fechada (`publicKey: null, trusted: false, authorizing: false, reason: 'UNTRUSTED_CALLER_KEY'`).
   - Se `key_id` existir na Trust Store e o chamador fornecer `embeddedPublicKey`, a chave do chamador é normalizada em SPKI PEM (`normalizePublicKeyPem`) e comparada com a chave pinada na Trust Store. Qualquer divergência falha fechada com `reason: 'KEY_ANCHOR_MISMATCH'`.

2. **Distinção Normativa entre Validade Matemática e Autoridade de Confiança (`src/vortex/verifier.ts`)**:
   - `VerificationResult` agora explicita `authorizing: boolean` e `trust_anchor: 'TRUST_STORE' | 'UNTRUSTED_CALLER_KEY' | 'NONE'`.
   - Provas acompanhadas de chave controlada pelo chamador não ancorada na Trust Store recebem `valid: false`, `authorizing: false`, `trust_anchor: 'UNTRUSTED_CALLER_KEY'` e `status: 'VERIFICATION_FAILED'`.

3. **Endurecimento do Verificador DAG v2 (`src/vortex/graph-verifier.ts` e `server.ts`)**:
   - `verifyExecutionGraph` utiliza exclusivamente a chave confiável `publicKeyPem` do verificador e rejeita qualquer nó cujo campo `signer` divirja da âncora de confiança.
   - O endpoint `POST /api/vortex/graph/verify` valida `isTrustedPublicKeyPem` antes de processar o grafo.

---

## 3. Critérios de Encerramento e Execução dos Testes de Aceitação

Para reproduzir e auditar localmente o encerramento do achado S0:

```bash
npm run test:s0
```

Saída determinística esperada:

```text
S0_FORGED_ACCEPTED_WITH_CALLER_KEY=false
FORGED_REJECTED_WITHOUT_KEY=true
  ✅ [PASS] 1. Reprodução S0: embeddedPublicKey do chamador rejeitada (não-autorizante)
  ✅ [PASS] 2. Substituição de chave em key_id legítimo bloqueada (KEY_ANCHOR_MISMATCH)
  ✅ [PASS] 3. Injeção inline em proof.identity.public_key rejeitada
  ✅ [PASS] 4. MCP tools/call vortex.verify bloqueia public_key/embeddedPublicKey não ancorada
  ✅ [PASS] 5. DAG v2 verifyExecutionGraph bloqueia substituição de proof.signer
  ✅ [PASS] 6. Trust Store independente valida e autoriza chaves legitimamente ancoradas
```
