# ==============================================================================
# BEND 1: CONSERVAÇÃO DE SALDO BANCÁRIO (SINTAXE BEND 1)
# ==============================================================================
# Port do modelo de liquidação financeira para sintaxe clássica do Bend 1.
# Demonstra que a propriedade de soma-zero é intrínseca à redução funcional.
# ==============================================================================

def transfer(sender_bal, receiver_bal, amount):
  if sender_bal >= amount:
    return (sender_bal - amount, receiver_bal + amount)
  else:
    return (sender_bal, receiver_bal)

def main():
  # Saldo inicial: Sender=1000, Receiver=250. Montante=200
  s_final, r_final = transfer(1000, 250, 200)
  # Soma inicial = 1250 | Soma final = 1250 (Zero-Sum Invariant)
  return (s_final, r_final)
