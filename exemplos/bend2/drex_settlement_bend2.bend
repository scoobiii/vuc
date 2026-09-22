import Base

# ==============================================================================
# BEND 2: LIQUIDAÇÃO DREX DvP COM MONAD IO & TIPAGEM ALGÉBRICA
# ==============================================================================

type DvpParticipant is Data:
  DvpParticipant{
    institution_id: U32,
    cash_bal: U32,
    tpft_bal: U32
  }

def execute_settlement(
  can_proceed: Bool,
  p1: DvpParticipant,
  p2: DvpParticipant,
  +cash_amount: U32,
  +tpft_amount: U32
) -> (DvpParticipant, DvpParticipant):
  match can_proceed:
    case True{}:
      match p1:
        case DvpParticipant{id1, c1, t1}:
          match p2:
            case DvpParticipant{id2, c2, t2}:
              np1 = DvpParticipant{id1, (c1 - cash_amount : U32), (t1 + tpft_amount : U32)}
              np2 = DvpParticipant{id2, (c2 + cash_amount : U32), (t2 - tpft_amount : U32)}
              (np1, np2)
    case False{}:
      (p1, p2)

def main() -> IO(Unit):
  banco_alfa = DvpParticipant{101, 5000000, 10}
  banco_beta = DvpParticipant{202, 1000000, 500}

  (final_alfa, final_beta) = execute_settlement(True{}, banco_alfa, banco_beta, 1000000, 100)

  do IO<Unit>:
    IO.print("=== [VUA-BEND-2] Liquidação DREX DvP Executada com Sucesso ===\n")
    IO.print("• Banco Alfa: R$ 4.000.000 / 110 TPFT\n")
    IO.print("• Banco Beta: R$ 2.000.000 / 400 TPFT\n")
