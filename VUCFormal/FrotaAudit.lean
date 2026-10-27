/-!
VUC Formal Verification — fleet-data invariants
Purpose: demonstrate that missing values are not silently treated as zero.
This formal model does not validate the truth of external operational data.
-/

namespace VUC.Formal.Fleet

structure FleetDay where
  planned : Option Nat
  available : Option Nat
  operated : Option Nat
  garageCount : Option Nat
  deriving Repr

def fleetDelta (a b : Option Nat) : Option Int :=
  match a, b with
  | some x, some y => some (Int.ofNat x - Int.ofNat y)
  | _, _ => none

theorem missing_is_not_zero (n : Nat) :
    (none : Option Nat) ≠ some n := by
  intro h
  cases h

theorem missing_data_blocks_comparison (n : Nat) :
    fleetDelta none (some n) = none := by
  rfl

theorem same_known_fleet_has_zero_delta (n : Nat) :
    fleetDelta (some n) (some n) = some 0 := by
  simp [fleetDelta]

end VUC.Formal.Fleet
