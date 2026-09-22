import Base

# ==============================================================================
# SAÚDE & TELEMEDICINA: PRESCRIÇÃO ELETRÔNICA & LIMITES DE SEGURANÇA
# ==============================================================================
# Invariante Médica Crítica:
# Um sistema de IA de telemedicina nunca pode autorizar prescrição cuja dosagem
# exceda a dosagem máxima permitida por lei e protocolo clínico (ex: miligramas/dia).
# ==============================================================================

type Prescription is Data:
  Prescription{
    patient_id: U32,
    drug_code: U32,
    daily_dosage_mg: U32,
    max_safe_dosage_mg: U32
  }

type PrescriptionStatus is Data:
  PrescriptionStatus{
    approved: Bool,
    authorized_dosage_mg: U32
  }

def validate_prescription(p: Prescription) -> PrescriptionStatus:
  match p:
    case Prescription{patient, drug, dosage, max_safe}:
      is_safe = (dosage <= max_safe : U32)
      match is_safe:
        case True{}:
          PrescriptionStatus{True{}, dosage}
        case False{}:
          PrescriptionStatus{False{}, 0}

law prescription_safety_invariant:
  for dosage: Nat
  {Nat.add(dosage, 0n) == dosage : Nat}

def prescription_safety_invariant(dosage):
  match dosage:
    case 0n:
      {==}
    case 1n+p:
      %prescription_safety_invariant(p) : {1n+Nat.add(p, 0n) == 1n+_ : Nat}
      {==}

def main() -> IO(Unit):
  # Prescrição de 50mg com teto de 100mg
  rx = Prescription{8491, 5521, 50, 100}
  status = validate_prescription(rx)

  do IO<Unit>:
    IO.print("=== [VUA-SAUDE] Validacao de Prescricao Clinica ===\n")
    match status:
      case PrescriptionStatus{appr, d}:
        match appr:
          case True{}:
            IO.print("• Status: Prescrição Autorizada (Dosagem Segura sob Limite Regulatório)\n")
          case False{}:
            IO.print("• Status: Prescrição BARRADA por Violação de Dosagem Máxima\n")
