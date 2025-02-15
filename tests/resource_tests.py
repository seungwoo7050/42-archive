#!/usr/bin/env python3
import json
import os
from pathlib import Path
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
PUSH_SWAP = ROOT / os.environ.get("PS_PUSH_SWAP", ".build/fault/push_swap")
BASELINE = ROOT / "tests" / "resource_baseline.json"
TIMEOUT_SECONDS = 5


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def deterministic_values(size, seed):
    values = list(range(size))
    state = seed & 0xFFFFFFFF
    for index in range(size - 1, 0, -1):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        selected = state % (index + 1)
        values[index], values[selected] = values[selected], values[index]
    offset = size * 23
    return [value * 37 - offset for value in values]


def parse_metrics(stderr):
    metrics = {}
    for line in stderr.decode("ascii").splitlines():
        if line.startswith("PS_") and "=" in line:
            name, value = line.split("=", 1)
            metrics[name] = int(value)
    return metrics


def check_case(case):
    values = deterministic_values(case["size"], case["seed"])
    environment = {
        name: value for name, value in os.environ.items() if not name.startswith("PS_")
    }
    environment["PS_REPORT_ALLOCATIONS"] = "1"
    environment["PS_REPORT_METRICS"] = "1"
    started = time.perf_counter()
    try:
        result = subprocess.run(
            [str(PUSH_SWAP), *[str(value) for value in values]],
            capture_output=True,
            cwd=ROOT,
            env=environment,
            timeout=TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired:
        fail(f"resource case timed out: {case!r}")
    elapsed_ms = (time.perf_counter() - started) * 1000
    if result.returncode != 0:
        fail(f"resource case failed: {case!r}, stderr={result.stderr!r}")
    metrics = parse_metrics(result.stderr)
    expected_keys = {
        "PS_LIVE_ALLOCATIONS",
        "PS_OPERATIONS",
        "PS_ARRAY_MOVEMENTS",
        "PS_PEAK_BYTES",
    }
    if set(metrics) != expected_keys:
        fail(f"incomplete resource metrics for {case!r}: {metrics!r}")
    commands = len(result.stdout.splitlines())
    if metrics["PS_LIVE_ALLOCATIONS"] != 0:
        fail(f"resource case leaked allocations: {case!r}")
    if commands != metrics["PS_OPERATIONS"]:
        fail(f"emitted and recorded command counts differ: {case!r}")
    if commands != case["commands"]:
        fail(f"command count changed: {case!r}, actual={commands}")
    if metrics["PS_ARRAY_MOVEMENTS"] > case["max_array_movements"]:
        fail(f"array movement budget exceeded: {case!r}, metrics={metrics!r}")
    if metrics["PS_PEAK_BYTES"] > case["max_peak_bytes"]:
        fail(f"peak allocation budget exceeded: {case!r}, metrics={metrics!r}")
    print(
        f"resource size={case['size']} seed={case['seed']} "
        f"commands={commands} movements={metrics['PS_ARRAY_MOVEMENTS']} "
        f"peak_bytes={metrics['PS_PEAK_BYTES']} elapsed_ms={elapsed_ms:.2f}"
    )


def main():
    with BASELINE.open(encoding="utf-8") as baseline_file:
        baseline = json.load(baseline_file)
    for case in baseline["cases"]:
        check_case(case)
    print("resource regression tests passed; elapsed time is informational")


if __name__ == "__main__":
    main()
