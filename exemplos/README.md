# Catálogo Geral de Exemplos Bend 1, Bend 2 e Indústria (VUA)

Este diretório reúne a suíte completa de especificações formais, simulações paralelas e invariantes mecânicas integradas ao ecossistema **VUA (Vortex Universal Adapter)**.

---

## Estrutura do Diretório

```
exemplos/
├── drex/                             # Soluções Formais para as Dores do DREX (Bacen)
│   ├── drex_atomic_dvp.bend          # Delivery versus Payment Atômico (Herstatt Risk)
│   ├── drex_privacy_conservation.bend# Sigilo Bancário (LC 105/2001) & Preservação Monetária
│   ├── drex_compliance_freeze.bend   # Bloqueio Cautelar Judicial (SisbaJud / BacenJud)
│   └── README.md                     # Análise regulatória e instruções reproduzíveis
│
├── bend1/                            # Exemplos na Sintaxe Clássica do Bend 1
│   ├── parallel_tree_bend1.bend      # Expansão 2^12 nós em árvore divide-and-conquer
│   └── fintech_balance_bend1.bend    # Conservação de saldo em funções puras
│
├── bend2/                            # Exemplos na Sintaxe Moderna do Bend 2
│   ├── parallel_tree_bend2.bend      # Árvores paralelas com IO Monad tipado
│   └── drex_settlement_bend2.bend    # Liquidação DREX com tipos algébricos de dados
│
├── negocios/                         # Casos de Negócio & Infraestrutura Crítica
│   ├── fintech_balance.bend          # Liquidação de pagamentos bancários
│   ├── logistica_inventory.bend      # Alocação de estoque e anti-overselling
│   ├── saude_telemedicina.bend       # Prescrição eletrônica e limites de dosagem
│   └── energia_smartgrid.bend        # Despacho térmico/solar e conservação de carga
│
└── entretenimento/                   # Gaming, Mídia & Metaverso
    ├── game_combat_damage.bend       # Combate autoritativo e anti-underflow de HP
    ├── streaming_royalties.bend      # Distribuição atômica de royalties digitais
    └── metaverse_atomic_swap.bend    # Troca atômica de skins/ativos sem duplicação
```

---

## Como Executar

### 1. Pelo VUA Engine (Embutido / Standalone)
Qualquer exemplo pode ser executado e verificado formalmente através da API do servidor:

```bash
# Executar qualquer código Bend
curl -X POST http://localhost:3000/api/bend/run \
  -H "Content-Type: application/json" \
  -d '{"code": "...codigo..."}'

# Checar leis formalmente
curl -X POST http://localhost:3000/api/bend/check \
  -H "Content-Type: application/json" \
  -d '{"code": "...codigo..."}'
```

### 2. Pela Interface VUA Workbench
Acesse a aba **"Bend Development"** no aplicativo web para selecionar qualquer um dos modelos, alterar parâmetros, executar e inspecionar os hashes determinísticos de execução RFC 8785 e as provas Ed25519.
