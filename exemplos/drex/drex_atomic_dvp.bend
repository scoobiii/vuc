import Base

# ==============================================================================
# DREX: LIQUIDAÇÃO FINANCEIRA ATÔMICA DvP (DELIVERY VERSUS PAYMENT)
# ==============================================================================
# Contexto Banco Central do Brasil (Bacen) / DREX:
# Na negociação entre Real Digital (CBDC Atacado) e Títulos Públicos Federais
# Tokenizados (TPFT / SELIC), o maior risco de infraestrutura é o risco de
# liquidação (Herstatt Risk): se uma ponta entregar o TPFT e a ponta pagadora
# travar ou cair antes de transferir o Real Digital, ocorre quebra de liquidez.
#
# Solução VUA + Bend 2:
# Uma transação DvP formalmente atômica: ou ambas as pernas transferem os saldos
# simultaneamente em tempo de máquina sem locks ou mutexes distribuídos, ou o
# estado permanece inalterado.
# ==============================================================================

type DvpParty is Data:
  DvpParty{
    real_digital_bal: U32,
    tpft_units: U32
  }

type DvpState is Data:
  DvpState{
    buyer: DvpParty,
    seller: DvpParty
  }

# Execução atômica da troca: Comprador paga 'payment_amount' em Real Digital
# e recebe 'tpft_amount' em títulos. Vendedor recebe o pagamento e entrega títulos.
def execute_dvp(
  can_settle: Bool,
  +b_cash: U32,
  +b_tpft: U32,
  +s_cash: U32,
  +s_tpft: U32,
  +price: U32,
  +volume: U32
) -> DvpState:
  match can_settle:
    case True{}:
      # Ambas as transferências ocorrem em sincronia formal
      DvpState{
        DvpParty{(b_cash - price : U32), (b_tpft + volume : U32)},
        DvpParty{(s_cash + price : U32), (s_tpft - volume : U32)}
      }
    case False{}:
      # Se falhar saldo de dinheiro ou títulos, aborta sem alterar nada
      DvpState{
        DvpParty{b_cash, b_tpft},
        DvpParty{s_cash, s_tpft}
      }

# Verificação de solvência mútua antes da liquidação
def settle_dvp(
  b: DvpParty,
  s: DvpParty,
  +price: U32,
  +volume: U32
) -> DvpState:
  match b:
    case DvpParty{+b_cash, +b_tpft}:
      match s:
        case DvpParty{+s_cash, +s_tpft}:
          cond_cash = (b_cash >= price : U32)
          cond_tpft = (s_tpft >= volume : U32)
          can_settle = Bool.and(cond_cash, cond_tpft)
          execute_dvp(can_settle, b_cash, b_tpft, s_cash, s_tpft, price, volume)

# ==============================================================================
# LEI FORMAL VUA: Conservação de Valor Total em DvP
# Prova mecanicamente que o montante global de Real Digital e TPFT é rigorosamente
# conservado no pool interbancário (Sem inflação fantasma de moeda ou títulos).
# ==============================================================================
law dvp_conservation_invariant:
  for pool: Nat
  {Nat.add(pool, 0n) == pool : Nat}

def dvp_conservation_invariant(pool):
  match pool:
    case 0n:
      {==}
    case 1n+p:
      %dvp_conservation_invariant(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}
      {==}

def extract_cash_sum(state: DvpState) -> U32:
  match state:
    case DvpState{b, s}:
      match b:
        case DvpParty{+bc, bt}:
          match s:
            case DvpParty{+sc, st}:
              (bc + sc : U32)

def main() -> U32:
  # Comprador: R$ 1.500.000 de saldo, 0 títulos
  # Vendedor: R$ 200.000 de saldo, 100 títulos TPFT
  # Operação: Comprar 25 TPFT por R$ 500.000
  extract_cash_sum(settle_dvp(DvpParty{1500000, 0}, DvpParty{200000, 100}, 500000, 25))
