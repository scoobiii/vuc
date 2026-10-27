#!/usr/bin/env python3
"""Fetch official TSE section turnout data and create a reproducible SP-capital comparison.

The output is descriptive. A causal estimate is only attempted when a documented
bus-exposure mapping is supplied; the SPTrans real-time API is not a historical
archive for 25/10/2026.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import sys
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

TSE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/detalhe_votacao_secao_{year}.zip"
REQUIRED = {
    "NR_TURNO", "SG_UF", "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO",
    "QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES",
}
OPTIONAL = {"NR_LOCAL_VOTACAO", "NM_LOCAL_VOTACAO"}
OUT = Path("artifacts/onibus-eleicoes-sp-2026")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    tmp = destination.with_suffix(destination.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": "VUC-election-audit/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, tmp.open("wb") as out:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            out.write(block)
    if not tmp.exists() or tmp.stat().st_size < 1024:
        tmp.unlink(missing_ok=True)
        raise RuntimeError("TSE download is empty or implausibly small")
    tmp.replace(destination)


def normalize(row: dict[str, str]) -> dict:
    return {
        "turno": int(row["NR_TURNO"]),
        "uf": row["SG_UF"].strip().upper(),
        "municipio": row["NM_MUNICIPIO"].strip().upper(),
        "zona": int(row["NR_ZONA"]),
        "secao": int(row["NR_SECAO"]),
        "local": row.get("NR_LOCAL_VOTACAO", "").strip(),
        "nome_local": row.get("NM_LOCAL_VOTACAO", "").strip(),
        "aptos": int(row["QT_APTOS"]),
        "comparecimento": int(row["QT_COMPARECIMENTO"]),
        "abstencoes": int(row["QT_ABSTENCOES"]),
    }


def read_sections(zip_path: Path) -> dict[tuple[int, int, int], dict]:
    result: dict[tuple[int, int, int], dict] = {}
    with zipfile.ZipFile(zip_path) as z:
        names = [n for n in z.namelist() if n.lower().endswith(".csv")]
        if not names:
            raise RuntimeError("No CSV files found in official TSE ZIP")
        brasil = [n for n in names if "BRASIL" in n.upper()]
        targets = sorted(brasil if brasil else names)
        found_header = False
        for name in targets:
            with z.open(name) as raw:
                text_stream = io.TextIOWrapper(raw, encoding="latin-1", newline="")
                reader = csv.DictReader(text_stream, delimiter=";")
                headers = set(reader.fieldnames or [])
                if not REQUIRED.issubset(headers):
                    continue
                found_header = True
                for row in reader:
                    if row.get("SG_UF", "").strip().upper() != "SP":
                        continue
                    if row.get("NM_MUNICIPIO", "").strip().upper() not in {"SAO PAULO", "SÃO PAULO"}:
                        continue
                    if row.get("NR_TURNO", "").strip() not in {"1", "2"}:
                        continue
                    record = normalize(row)
                    if record["aptos"] <= 0:
                        continue
                    if record["comparecimento"] + record["abstencoes"] != record["aptos"]:
                        raise RuntimeError(
                            "TSE section arithmetic mismatch: "
                            f"turno={record['turno']} zona={record['zona']} secao={record['secao']}"
                        )
                    key = (record["turno"], record["zona"], record["secao"])
                    previous = result.get(key)
                    if previous and any(previous[k] != record[k] for k in ("aptos", "comparecimento", "abstencoes")):
                        raise RuntimeError(f"Conflicting duplicate section rows: {key}")
                    result[key] = record
        if not found_header:
            raise RuntimeError("Official TSE CSV headers do not match expected schema")
    if not any(k[0] == 1 for k in result) or not any(k[0] == 2 for k in result):
        raise RuntimeError("TSE source must contain sections from both rounds; refusing partial comparison")
    return result


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def analyze(records: dict, exposure_path: Path | None) -> dict:
    by_round = defaultdict(list)
    for (turn, _zone, _section), row in records.items():
        by_round[turn].append(row)
    totals = {}
    for turn in (1, 2):
        rows = by_round[turn]
        aptos = sum(r["aptos"] for r in rows)
        present = sum(r["comparecimento"] for r in rows)
        absent = sum(r["abstencoes"] for r in rows)
        totals[str(turn)] = {
            "sections": len(rows), "eligible": aptos, "turnout": present,
            "abstentions": absent,
            "turnout_rate": round(present / aptos, 8) if aptos else None,
            "abstention_rate": round(absent / aptos, 8) if aptos else None,
        }

    keys1 = {(z, s): r for (t, z, s), r in records.items() if t == 1}
    keys2 = {(z, s): r for (t, z, s), r in records.items() if t == 2}
    paired = sorted(set(keys1) & set(keys2))
    section_rows = []
    for zone, section in paired:
        a, b = keys1[(zone, section)], keys2[(zone, section)]
        section_rows.append({
            "zona": zone, "secao": section,
            "aptos_turno1": a["aptos"], "comparecimento_turno1": a["comparecimento"],
            "abstencoes_turno1": a["abstencoes"],
            "taxa_abstencao_turno1": round(a["abstencoes"] / a["aptos"], 8),
            "aptos_turno2": b["aptos"], "comparecimento_turno2": b["comparecimento"],
            "abstencoes_turno2": b["abstencoes"],
            "taxa_abstencao_turno2": round(b["abstencoes"] / b["aptos"], 8),
            "delta_taxa_abstencao_pp": round(100 * (b["abstencoes"] / b["aptos"] - a["abstencoes"] / a["aptos"]), 6),
            "local_turno1": a["local"], "local_turno2": b["local"],
        })

    exposure_result = {
        "joined": False,
        "reason": "No verified historical bus-exposure mapping supplied; no exposed/control estimate made.",
        "exposed_sections": 0,
        "control_sections": 0,
        "difference_in_abstention_change_pp": None,
    }
    if exposure_path and exposure_path.exists():
        exposure_rows = list(csv.DictReader(exposure_path.open(encoding="utf-8-sig", newline="")))
        if exposure_rows:
            exposure_map = {}
            for r in exposure_rows:
                local = r.get("NR_LOCAL_VOTACAO", "").strip()
                group = r.get("exposicao_onibus", "").strip().lower()
                if not local or group not in {"alta", "controle"}:
                    raise RuntimeError("Exposure mapping requires NR_LOCAL_VOTACAO and exposicao_onibus=alta|controle")
                if local in exposure_map and exposure_map[local] != group:
                    raise RuntimeError(f"Conflicting exposure group for local {local}")
                exposure_map[local] = group
            groups = defaultdict(list)
            for row in section_rows:
                local = row["local_turno2"] or row["local_turno1"]
                group = exposure_map.get(local)
                if group:
                    groups[group].append(row)
            for group in ("alta", "controle"):
                if not groups[group]:
                    raise RuntimeError(f"Exposure join found no paired sections for group '{group}'")
            def weighted_delta(items):
                eligible = sum(r["aptos_turno2"] for r in items)
                return sum(
                    (r["abstencoes_turno2"] / r["aptos_turno2"] -
                     r["abstencoes_turno1"] / r["aptos_turno1"]) * r["aptos_turno2"]
                    for r in items
                ) / eligible
            high = weighted_delta(groups["alta"])
            control = weighted_delta(groups["controle"])
            exposure_result = {
                "joined": True,
                "reason": "Descriptive difference only; not adjusted for confounders and not causal proof.",
                "exposed_sections": len(groups["alta"]),
                "control_sections": len(groups["controle"]),
                "difference_in_abstention_change_pp": round(100 * (high - control), 6),
            }

    write_csv(
        OUT / "tse_section_turnout.csv", section_rows,
        ["zona", "secao", "aptos_turno1", "comparecimento_turno1", "abstencoes_turno1",
         "taxa_abstencao_turno1", "aptos_turno2", "comparecimento_turno2", "abstencoes_turno2",
         "taxa_abstencao_turno2", "delta_taxa_abstencao_pp", "local_turno1", "local_turno2"],
    )
    return {
        "status": "PASS",
        "source": TSE_URL.format(year=2026),
        "source_zip_sha256": sha256(zip_path),
        "municipality": "São Paulo, SP",
        "turnout_by_round": totals,
        "paired_sections": len(paired),
        "exposure_analysis": exposure_result,
        "causal_electoral_effect_estimated": False,
        "caveat": "Round-to-round turnout changes alone cannot identify a bus-service causal effect.",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, help="Use an already downloaded official TSE ZIP")
    parser.add_argument("--exposure-csv", type=Path, default=Path("audits/onibus-eleicoes-sp-2026/exposicao_locais.csv"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    zip_path = args.zip or OUT / "detalhe_votacao_secao_2026.zip"
    if not args.zip:
        download(TSE_URL.format(year=2026), zip_path)
    summary = analyze(read_sections(zip_path), args.exposure_csv)
    (OUT / "tse-turnout-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("TSE_TURNOUT_ANALYSIS=PASS")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"TSE_TURNOUT_ANALYSIS=FAIL: {exc}", file=sys.stderr)
        raise
