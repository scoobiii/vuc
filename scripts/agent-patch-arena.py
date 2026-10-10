#!/usr/bin/env python3
"""Vortex Agent Patch Arena evaluator.

This evaluator treats every proposed patch as untrusted and compares it with the
exact base revision under the same workload. The verdict is evidence-based:
absolute quality gates first, then robust performance comparison.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import subprocess
import tempfile
import time
from pathlib import Path

ITERATIONS = 1000
REPEATS = 5
MIN_THROUGHPUT_GAIN = 0.05
MAX_LATENCY_REGRESSION = 0.02
MAX_MEMORY_REGRESSION = 0.05
MAX_CV = 0.10


def run(cmd: list[str], cwd: Path, timeout: int = 900) -> tuple[int, str, float]:
    started = time.perf_counter()
    env = os.environ.copy()
    for key in ("GITHUB_TOKEN", "GH_TOKEN", "NODE_AUTH_TOKEN"):
        env.pop(key, None)
    proc = subprocess.run(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=timeout, check=False)
    return proc.returncode, proc.stdout, time.perf_counter() - started


def median(values: list[float]) -> float:
    return statistics.median(values)


def coefficient_of_variation(values: list[float]) -> float:
    m = statistics.mean(values)
    return 0.0 if m == 0 else statistics.pstdev(values) / m


def metric(pattern: str, output: str, cast=float) -> float:
    match = re.search(pattern, output, re.MULTILINE)
    if not match:
        raise RuntimeError(f"Benchmark metric not found: {pattern}")
    return cast(match.group(1).replace(",", ""))


def benchmark_once(path: Path) -> dict[str, float]:
    code, output, elapsed = run(["npx", "tsx", "bin/vua.js", "bench", "--iterations", str(ITERATIONS)], path, timeout=300)
    if code != 0:
        raise RuntimeError(f"bench failed with exit {code}\n{output}")
    return {
        "throughput_ops_s": metric(r"Throughput\s*:\s*([0-9.,]+)\s*ops/seg", output),
        "latency_us": metric(r"Latência Média\s*:\s*([0-9.,]+)\s*µs", output),
        "rss_mb": metric(r"Consumo de Memória\s*:\s*([0-9.,]+)\s*MB", output),
        "elapsed_s": elapsed,
    }


def prepare(path: Path) -> list[str]:
    commands = [
        ["npm", "ci", "--ignore-scripts"],
        ["npm", "run", "install:bend"],
        ["npm", "run", "lint"],
        ["npm", "run", "verify:gos3"],
        ["npm", "run", "build"],
        ["npm", "test"],
    ]
    failures: list[str] = []
    for command in commands:
        code, output, _ = run(command, path, timeout=1200)
        if code != 0:
            failures.append(f"{' '.join(command)}\n{output[-12000:]}")
    return failures


def benchmark(path: Path) -> tuple[dict[str, float], list[dict[str, float]]]:
    samples = [benchmark_once(path) for _ in range(REPEATS)]
    return {key: median([sample[key] for sample in samples]) for key in samples[0]}, samples


def classify_intent(files: list[str]) -> str:
    categories: set[str] = set()
    for name in files:
        path = name.lower()
        if any(token in path for token in ("benchmark", "performance", "semantic-oracle", "canonicalize")):
            categories.add("performance")
        elif any(token in path for token in ("oauth", "security", "crypto", "verifier", "trust-anchor", "policy", "sandbox", "credential")):
            categories.add("security")
        elif path.startswith(".github/workflows/") or any(token in path for token in ("conformance", "gos3", "internal-governance", "patch-arena")):
            categories.add("governance")
        elif path.startswith(("src/", "tests/", "bin/")):
            categories.add("correctness")
        else:
            categories.add("documentation")
    if not categories:
        return "mixed"
    if categories == {"documentation"}:
        return "governance"
    # Performance mixed with another intent is never auto-qualified.
    if "performance" in categories:
        return "performance" if categories == {"performance"} else "mixed"
    # Security/governance/correctness changes can be evaluated under a bounded
    # no-regression policy; repository branch protection still requires review.
    if "security" in categories:
        return "security"
    if "governance" in categories:
        return "governance"
    if "correctness" in categories:
        return "correctness"
    return "mixed"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    changed = subprocess.run(
        ["git", "diff", "--name-only", args.base, args.head],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
    )
    if changed.returncode != 0:
        raise RuntimeError(f"Cannot derive changed files from exact refs: {changed.stderr}")
    changed_files = [line for line in changed.stdout.splitlines() if line]
    intent = classify_intent(changed_files)

    with tempfile.TemporaryDirectory(prefix="vortex-arena-") as temp:
        work = Path(temp)
        base = work / "base"
        head = work / "head"
        for target, sha in ((base, args.base), (head, args.head)):
            subprocess.run(["git", "worktree", "add", "--detach", str(target), sha], check=True)

        try:
            base_failures = prepare(base)
            head_failures = prepare(head)
            result: dict = {
                "schema": "vortex.patch-arena.v1",
                "base_sha": args.base,
                "head_sha": args.head,
                "intent": intent,
                "changed_files": changed_files,
                "policy": {"min_throughput_gain": MIN_THROUGHPUT_GAIN, "max_latency_regression": MAX_LATENCY_REGRESSION, "max_memory_regression": MAX_MEMORY_REGRESSION, "max_cv": MAX_CV, "repeats": REPEATS, "iterations": ITERATIONS, "non_performance_min_throughput_gain": -0.02},
                "quality": {"base_failures": base_failures, "head_failures": head_failures, "passed": not base_failures and not head_failures},
            }

            if base_failures or head_failures:
                result["verdict"] = "REJECT"
                result["reason"] = "absolute quality gate failure"
            else:
                base_metrics, base_samples = benchmark(base)
                head_metrics, head_samples = benchmark(head)
                throughput_gain = head_metrics["throughput_ops_s"] / base_metrics["throughput_ops_s"] - 1
                latency_change = head_metrics["latency_us"] / base_metrics["latency_us"] - 1
                memory_change = head_metrics["rss_mb"] / base_metrics["rss_mb"] - 1
                base_cv = coefficient_of_variation([s["throughput_ops_s"] for s in base_samples])
                head_cv = coefficient_of_variation([s["throughput_ops_s"] for s in head_samples])
                stable = max(base_cv, head_cv) <= MAX_CV
                superior = throughput_gain >= MIN_THROUGHPUT_GAIN and latency_change <= MAX_LATENCY_REGRESSION and memory_change <= MAX_MEMORY_REGRESSION and stable
                bounded_no_regression = throughput_gain >= -0.02 and latency_change <= MAX_LATENCY_REGRESSION and memory_change <= MAX_MEMORY_REGRESSION and stable
                result["base"] = {"median": base_metrics, "samples": base_samples, "cv": base_cv}
                result["head"] = {"median": head_metrics, "samples": head_samples, "cv": head_cv}
                result["delta"] = {"throughput_gain_pct": throughput_gain * 100, "latency_change_pct": latency_change * 100, "memory_change_pct": memory_change * 100, "base_cv": base_cv, "head_cv": head_cv}
                if intent == "performance":
                    result["verdict"] = "PASS_SUPERIOR" if superior else "REJECT"
                    result["reason"] = "measured performance gain and stability thresholds passed" if superior else "performance change did not demonstrate the required measured gain"
                elif bounded_no_regression and intent == "security":
                    result["verdict"] = "PASS_SECURITY"
                    result["reason"] = "absolute quality gates passed and measured regression remains within security policy"
                elif bounded_no_regression and intent == "governance":
                    result["verdict"] = "PASS_GOVERNANCE"
                    result["reason"] = "absolute quality gates passed and measured regression remains within governance policy"
                elif bounded_no_regression and intent == "correctness":
                    result["verdict"] = "PASS_CORRECTNESS"
                    result["reason"] = "absolute quality gates passed and measured regression remains bounded"
                elif bounded_no_regression:
                    result["verdict"] = "NEEDS_MANUAL_REVIEW"
                    result["reason"] = "mixed intent passed absolute gates and bounded regression policy; human review required"
                else:
                    result["verdict"] = "REJECT"
                    result["reason"] = "candidate failed the intent-specific performance or no-regression policy"

            Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(result, indent=2))
            return 0 if result["verdict"] in {"PASS_SUPERIOR", "PASS_SECURITY", "PASS_GOVERNANCE", "PASS_CORRECTNESS", "NEEDS_MANUAL_REVIEW"} else 1
        finally:
            for target in (head, base):
                subprocess.run(["git", "worktree", "remove", "--force", str(target)], check=False)


if __name__ == "__main__":
    raise SystemExit(main())
