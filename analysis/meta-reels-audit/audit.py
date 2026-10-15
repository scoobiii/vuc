#!/usr/bin/env python3
"""Reproduce published aggregate checks, not the unavailable 300-row raw analysis."""
import csv, hashlib, json, statistics
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "published_profile_aggregates.csv"
OUT = ROOT / "audit-result.json"

def load():
    with DATA.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        for key in ("followers_m","mean_m","median_m","sd_m","cv_pct","median_pct","mean_pct","above_followers","by_first_round"):
            r[key] = float(r[key])
    return rows

def near(a, b, tolerance=0.06):
    return abs(a-b) <= tolerance

def main():
    rows = load()
    case = next(r for r in rows if r["group"] == "case")
    group_values = {g: [r["median_pct"] for r in rows if r["group"] == g] for g in ("deputies","Brazil","world")}
    medians = {g: statistics.median(v) for g,v in group_values.items()}
    displayed_medians = {g: float(Decimal(str(m)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for g,m in medians.items()}
    ratios = {g: case["median_pct"]/displayed_medians[g] for g in medians}
    checks = {
        "exactly_30_profiles": len(rows) == 30,
        "comparison_groups_9_10_10": [len(group_values[g]) for g in ("deputies","Brazil","world")] == [9,10,10],
        "nikolas_10_of_10_above_followers": case["above_followers"] == 10,
        "nikolas_mean_41_05m": near(case["mean_m"],41.05,0.001),
        "nikolas_median_38_25m": near(case["median_m"],38.25,0.001),
        "group_medians_match_publication": near(medians["deputies"],9.68,0.02) and near(medians["Brazil"],5.675,0.02) and near(medians["world"],4.925,0.02),
        "ratios_match_publication": near(ratios["deputies"],17.2) and near(ratios["Brazil"],29.3) and near(ratios["world"],33.7,0.08),
        "24_of_300_reels_above_follower_counts": sum(int(r["above_followers"]) for r in rows) == 24,
        "case_median_percentage_recalculates": near(case["median_m"]/case["followers_m"]*100,case["median_pct"],0.02),
    }
    report = {
        "schema":"vuc.source-aggregate-audit.v1",
        "status":"PASS" if all(checks.values()) else "FAIL",
        "scope":"Reproduction of published profile-level aggregate values only; not raw-data reanalysis or causal inference.",
        "source":{"publisher":"Sleeping Giants Brasil","title":"Visualizações de Reels e indícios de favorecimento algorítmico: o caso Nikolas Ferreira no Instagram","publication":"October 2026","collection_date":"2026-10-11","table_pages":[21,22],"annex_page":36,"raw_reel_rows_available":False},
        "input":{"path":DATA.name,"sha256":hashlib.sha256(DATA.read_bytes()).hexdigest(),"profile_rows":len(rows)},
        "metrics":{"nikolas_median_views_per_follower_pct":case["median_pct"],"group_medians_pct":medians,"ratios_vs_group_medians":ratios,"reels_above_follower_count":sum(int(r["above_followers"]) for r in rows),"reported_reels_total":300},
        "checks":checks,
        "interpretation":"A reproduced disparity is not proof of algorithmic favoritism. Public aggregate view counts cannot separate recommendation effects from content performance, repeat views, sharing networks, or paid/organized promotion."
    }
    OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if report["status"] != "PASS":
        raise SystemExit(1)

if __name__ == "__main__":
    main()
