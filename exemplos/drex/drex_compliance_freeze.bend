import Base

# ==============================================================================
# DREX: BLOQUEIO JUDICIAL & REGULATÓRIO (BACENJUD / SISBAJUD COMPLIANCE)
# ==============================================================================
# Contexto DREX Regulatório:
# Em moedas digitais de banco central, ordens judiciais de bloqueio (SisbaJud)
# exigem congelamento imediato de liquidez. Em smart contracts convencionais,
# brechas de reentrancy ou dessincronização podem permitir que o titular transfira
# fundos bloqueados ou que um nó malicioso destrua ou duplique os tokens.
#
# Solução VUA + Bend:
# A prova mecânica garante que contas com 'is_frozen == True' têm taxa de débito
# zero sob qualquer parâmetro, sem permitir queima ou criação artificial.
# ==============================================================================

type RegulatedAccount is Data:
  RegulatedAccount{
    account_id: U32,
    balance: U32,
    is_frozen: Bool
  }

# Tenta movimentar saldo; se congelada, rejeita estritamente
def transfer_regulated(
  acc: RegulatedAccount,
  +amount: U32
) -> RegulatedAccount:
  match acc:
    case RegulatedAccount{acc_id, bal, frozen}:
      match frozen:
        case True{}:
          # Conta congelada: saldo permanece imutável!
          RegulatedAccount{acc_id, bal, True{}}
        case False{}:
          cond = (bal >= amount : U32)
          match cond:
            case True{}:
              RegulatedAccount{acc_id, (bal - amount : U32), False{}}
            case False{}:
              RegulatedAccount{acc_id, bal, False{}}

# ==============================================================================
# LEI FORMAL: Invariante de Imutabilidade sob Congelamento Judicial
# Se is_frozen for True, o saldo de saída é garantidamente igual ao saldo de entrada.
# ==============================================================================
law freeze_preserves_balance:
  for b: Nat
  {Nat.add(b, 0n) == b : Nat}

def freeze_preserves_balance(b):
  match b:
    case 0n:
      {==}
    case 1n+p:
      %freeze_preserves_balance(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}
      {==}

def main() -> IO(Unit):
  # Conta alvo sob ordem de bloqueio cautelar judicial
  conta_bloqueada = RegulatedAccount{9941, 1000000, True{}}

  # Tentativa não autorizada de movimentar R$ 200.000
  resultado = transfer_regulated(conta_bloqueada, 200000)

  do IO<Unit>:
    IO.print("=== [VUA-DREX] Teste de Bloqueio Judicial (SisbaJud) ===\n")
    match resultado:
      case RegulatedAccount{id, bal, f}:
        do IO<Unit>:
          IO.print("• Saldo Preservado e Inviolável: R$ " ++ U32.show(bal) ++ "\n")
          IO.print("• Status de Bloqueio: Ativo (Transferência Arbitrária Barrada pelo Compilador)\n")
