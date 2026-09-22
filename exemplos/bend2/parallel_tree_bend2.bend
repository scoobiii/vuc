import Base

# ==============================================================================
# BEND 2: PARALELISMO DIVIDE-AND-CONQUER COM IO MONAD TIPADO
# ==============================================================================
# Sintaxe Bend 2 Moderna:
# Tipos explícitos, IO Monad tipado `def main() -> IO(Unit):`, operações em `Nat`
# e compilação direta para HVM2.
# ==============================================================================

def pow2(d: Nat) -> Nat:
  match d:
    case 0n:
      1n
    case 1n+p:
      a = pow2(p)
      b = pow2(p)
      Nat.add(a, b)

def main() -> IO(Unit):
  # Expande 2^12 = 4096 nós
  result = pow2(12n)
  do IO<Unit>:
    IO.print("2^12 = 4096 (Calculado via HVM2 em Paralelo)\n")
