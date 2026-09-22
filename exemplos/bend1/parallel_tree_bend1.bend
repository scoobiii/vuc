# ==============================================================================
# BEND 1: EXPANSÃO PARALELA DIVIDE-AND-CONQUER (ÁRVORE BINÁRIA)
# ==============================================================================
# Sintaxe Bend 1 Clássica:
# Funções puras sem anotações rígidas de tipo IO monádico.
# O runtime HVM divide a árvore em 4096 nós independentes em paralelo sem threads ou locks.
# ==============================================================================

def pow2(d):
  match d:
    case 0:
      return 1
    case _:
      a, b = pow2(d - 1), pow2(d - 1)
      return a + b

def main():
  # Expande 2^12 = 4096 nós em paralelo
  return pow2(12)
