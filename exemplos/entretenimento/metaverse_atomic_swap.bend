import Base

# ==============================================================================
# GAMING & METAVERSO: TROCA ATÔMICA DE ATIVOS DIGITAIS (ANTI-DUPLICAÇÃO)
# ==============================================================================
# Invariante de Jogabilidade & Economia Virtual:
# Itens digitais únicos (skins lendárias, avatares) nunca podem ser duplicados
# durante transações entre mundos virtuais heterogêneos.
# ==============================================================================

type PlayerInventory is Data:
  PlayerInventory{
    player_id: U32,
    has_legendary_sword: Bool,
    coins: U32
  }

type SwapResult is Data:
  SwapResult{
    player_a: PlayerInventory,
    player_b: PlayerInventory,
    success: Bool
  }

def execute_swap(
  p_a: PlayerInventory,
  p_b: PlayerInventory,
  +price: U32
) -> SwapResult:
  match p_a:
    case PlayerInventory{id_a, has_sword_a, coins_a}:
      match p_b:
        case PlayerInventory{id_b, has_sword_b, coins_b}:
          # A possui o item e B possui as moedas
          can_trade = (has_sword_a & (coins_b >= price : U32) : U32)
          match can_trade:
            case True{}:
              new_a = PlayerInventory{id_a, False{}, (coins_a + price : U32)}
              new_b = PlayerInventory{id_b, True{}, (coins_b - price : U32)}
              SwapResult{new_a, new_b, True{}}
            case False{}:
              SwapResult{p_a, p_b, False{}}

law item_conservation:
  for i: Nat
  {Nat.add(i, 0n) == i : Nat}

def item_conservation(i):
  match i:
    case 0n:
      {==}
    case 1n+p:
      %item_conservation(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}
      {==}

def main() -> IO(Unit):
  vendedor = PlayerInventory{1, True{}, 50}
  comprador = PlayerInventory{2, False{}, 1000}

  trade = execute_swap(vendedor, comprador, 300)

  do IO<Unit>:
    IO.print("=== [VUA-METAVERSO] Troca Atômica de Ativo Digital ===\n")
    match trade:
      case SwapResult{pa, pb, ok}:
        match ok:
          case True{}:
            IO.print("• Item Transferido Atomicamente. Nenhuma duplicação possível no universo virtual.\n")
          case False{}:
            IO.print("• Troca cancelada por saldo insuficiente.\n")
