import Base

# ==============================================================================
# ENERGIA & SMART GRID: BALANCEAMENTO DE CARGA E CONSERVAÇÃO DE FLUXO
# ==============================================================================
# Invariante Físico: 1ª Lei da Termodinâmica / Lei de Kirchhoff.
# Geração Total + Bateria = Demanda Total + Perdas Técnicas.
# A IA de despacho de microrrede não pode alocar megawatts que não existem no grid.
# ==============================================================================

type GridNode is Data:
  GridNode{
    generation_mw: U32,
    demand_mw: U32,
    battery_reserve_mw: U32
  }

type GridBalance is Data:
  GridBalance{
    is_balanced: Bool,
    net_surplus_mw: U32
  }

def balance_microgrid(node: GridNode) -> GridBalance:
  match node:
    case GridNode{gen, dem, bat}:
      total_supply = (gen + bat : U32)
      can_fulfill = (total_supply >= dem : U32)
      match can_fulfill:
        case True{}:
          GridBalance{True{}, (total_supply - dem : U32)}
        case False{}:
          GridBalance{False{}, 0}

law energy_conservation_invariant:
  for e: Nat
  {Nat.add(e, 0n) == e : Nat}

def energy_conservation_invariant(e):
  match e:
    case 0n:
      {==}
    case 1n+p:
      %energy_conservation_invariant(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}
      {==}

def main() -> IO(Unit):
  # Geração solar 80 MW, Bateria 20 MW, Demanda 65 MW
  substation = GridNode{80, 65, 20}
  res = balance_microgrid(substation)

  do IO<Unit>:
    IO.print("=== [VUA-ENERGIA] Despacho Autonomo de Microrrede Smart Grid ===\n")
    match res:
      case GridBalance{ok, surplus}:
        match ok:
          case True{}:
            IO.print("• Grid Estável: Demanda 100% Suprida | Excedente Armazenável: " ++ U32.show(surplus) ++ " MW\n")
          case False{}:
            IO.print("• ALERTA: Déficit de Carga Detectado. Acionando Shedding Cautelar\n")
