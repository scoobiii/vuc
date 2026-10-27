#!/usr/bin/env python3
"""Validate arithmetic and caveats in the preliminary SP bus/election audit.

This validates the committed descriptive dataset only. It does not fetch external
sources and does not estimate causal effects on turnout or vote choice.
"""
from __future__ import annotations

import csv
import hashlib
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_DIR = ROOT / "audits" / "onibus-eleicoes-sp-2026"
CSV_PATH = AUDIT_DIR / "indicadores.csv"
README_PATH = AUDIT_DIR / "README.md"
OUT_DIR = ROOT / "artifacts" / "onibus-eleicoes-sp-2026"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))

    assert len(rows) == 8, f"Expected 8 indicators, found {len(rows)}"
    by_name = {row["indicador"]: row for row in rows}

    fleet = Decimal(by_name["Frota em circulação às 13h20"]["valor"])
    fleet_gap = Decimal(by_name["Diferença para a meta de 100%"]["valor"])
    east = Decimal(by_name["Frota em circulação na Zona Leste"]["valor"])
    east_gap = Decimal(by_name["Diferença da Zona Leste para 100%"]["valor"])
    periphery = Decimal(by_name["Redução de oferta nas periferias versus sábado"]["valor"])
    affluent = Decimal(by_name["Redução de oferta nos bairros mais ricos versus sábado"]["valor"])
    difference = Decimal(by_name["Diferença entre reduções reportadas"]["valor"])
    exposed = Decimal(by_name["Eleitores aptos em 466 locais com queda de ônibus >=20% onde Lula venceu no 1º turno"]["valor"])

    assert fleet + fleet_gap == Decimal("100"), "Fleet gap arithmetic mismatch"
    assert east + east_gap == Decimal("100"), "Zona Leste gap arithmetic mismatch"
    assert periphery - affluent == difference, "Reported reduction difference mismatch"
    assert exposed == exposed.to_integral_value() and exposed > 0, "Exposed electorate must be a positive integer"
    assert Decimal("0") <= fleet <= Decimal("100")
    assert Decimal("0") <= east <= Decimal("100")

    caveats = README_PATH.read_text(encoding="utf-8").lower()
    for required in ("não contém uma estimativa causal", "não equivalem", "não prova causalidade"):
        assert required in caveats, f"Required caveat missing: {required}"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "status": "PASS",
        "validation_scope": "descriptive arithmetic and caveat checks only",
        "causal_electoral_effect_estimated": False,
        "indicators_validated": len(rows),
        "fleet_percent": str(fleet),
        "fleet_gap_percentage_points": str(fleet_gap),
        "zona_leste_percent": str(east),
        "zona_leste_gap_percentage_points": str(east_gap),
        "periphery_vs_affluent_reduction_gap_percentage_points": str(difference),
        "potentially_exposed_eligible_voters_reported": int(exposed),
        "source_csv_sha256": sha256(CSV_PATH),
        "methodology_readme_sha256": sha256(README_PATH),
    }
    (OUT_DIR / "validation-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("AUDIT_VALIDATION=PASS")


if __name__ == "__main__":
    main()
