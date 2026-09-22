# Exemplos DREX: Soluções Formais para as Dores do Real Digital com Bend e VUA

Este diretório contém especificações executáveis e modelos formais no runtime **Bend** integrados ao protocolo **VUA (Vortex Universal Adapter)**, atacando diretamente os três maiores gargalos e desafios arquiteturais do projeto **DREX** do Banco Central do Brasil (Bacen).

---

## 1. As 3 Dores Críticas do DREX e as Soluções VUA + Bend

### Dor 1: Risco de Liquidação em DvP (Herstatt Risk)
- **Problema Real**: Na liquidação de Títulos Públicos Federais Tokenizados (TPFT) contra Real Digital de atacado, se a entrega do título e o débito da moeda não forem estritamente simultâneos e atômicos, uma falha de rede ou timeout deixa uma das instituições financeiras no prejuízo unilateral.
- **Solução Bend (`drex_atomic_dvp.bend`)**: Execução formal atômica baseada em Interaction Combinators (HVM). Não há threads concorrentes nem locks distribuídos; a transferência ocorre em sincronia matemática ininterrupta.
- **Invariante Provada**: `dvp_conservation_invariant` — a soma global de caixa e de títulos entre os participantes é rigorosamente imutável.

### Dor 2: Privacidade vs Auditabilidade (Lei Complementar nº 105/2001)
- **Problema Real**: O artigo 5º da LC 105/2001 impõe dever de sigilo bancário. Em uma DLT compartilhada entre 16+ bancos, validadores externos não podem ter visibilidade sobre os saldos de clientes de terceiros, mas o sistema precisa atestar que nenhum token foi criado artificialmente do nada.
- **Solução Bend (`drex_privacy_conservation.bend`)**: Saldos são representados sob compromissos com checagem formal homomórfica.
- **Invariante Provada**: `private_mass_conservation` — conservação estrita da massa monetária do pool com *zero leakage* da identidade dos titulares.

### Dor 3: Bloqueio Judicial e Cautelar (SisbaJud / BacenJud)
- **Problema Real**: Em smart contracts convencionais, brechas de reentrancy, duplicação de saldo ou transações paralelas podem burlar ordens de congelamento judicial emitidas pelo Banco Central.
- **Solução Bend (`drex_compliance_freeze.bend`)**: A semântica estrita de tipos algébricos impede mecanicamente que qualquer função debite saldo quando `is_frozen == True`.
- **Invariante Provada**: `freeze_preserves_balance` — garantia formal de imutabilidade do saldo sob ordem cautelar.

---

## 2. Como Reproduzir os Exemplos

### Execução via VUA Workbench / CLI
No terminal ou via interface do VUA:

```bash
# Executar DvP Atômico
vua adapter invoke bend --action run_program --payload '{"code": "...conteúdo do arquivo..."}'

# Ou via endpoint REST
curl -X POST http://localhost:3000/api/bend/run \
  -H "Content-Type: application/json" \
  -d '{"code": "import Base\n..."}'
```

Todos os resultados geram hashes criptográficos de entrada, saída e execução atestados por Ed25519 pelo VUA.
