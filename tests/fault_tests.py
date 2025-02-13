#!/usr/bin/env python3
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
PUSH_SWAP = ROOT / os.environ.get("PS_PUSH_SWAP", ".build/fault/push_swap")
CHECKER = ROOT / os.environ.get("PS_CHECKER", ".build/fault/checker")
ALLOCATION_REPORT = b"PS_LIVE_ALLOCATIONS=0\n"


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def assert_equal(actual, expected, message):
    if actual != expected:
        fail(f"{message}: expected {expected!r}, got {actual!r}")


def assert_true(condition, message):
    if not condition:
        fail(message)


def run(binary, args, input_bytes=b"", faults=None):
    environment = os.environ.copy()
    environment["PS_REPORT_ALLOCATIONS"] = "1"
    if faults:
        environment.update({key: str(value) for key, value in faults.items()})
    try:
        result = subprocess.run(
            [str(binary), *[str(arg) for arg in args]],
            input=input_bytes,
            capture_output=True,
            cwd=ROOT,
            env=environment,
            timeout=3,
            check=False,
        )
    except subprocess.TimeoutExpired:
        fail(f"{binary.name} timed out with faults {faults!r}")
    assert_true(
        b"PS_LIVE_ALLOCATIONS=NONZERO" not in result.stderr,
        f"{binary.name} leaked allocations with faults {faults!r}",
    )
    assert_true(
        ALLOCATION_REPORT in result.stderr,
        f"{binary.name} did not report cleanup with faults {faults!r}",
    )
    result.stderr = result.stderr.replace(ALLOCATION_REPORT, b"")
    return result


def test_nth_allocation_failures():
    for index in range(1, 6):
        result = run(
            PUSH_SWAP,
            ["4", "3", "2", "1"],
            faults={"PS_FAIL_MALLOC_AT": index},
        )
        assert_true(result.returncode != 0, f"push_swap malloc #{index} fails")
        assert_equal(result.stderr, b"Error\n", "push_swap allocation error")
    success = run(
        PUSH_SWAP,
        ["4", "3", "2", "1"],
        faults={"PS_FAIL_MALLOC_AT": 6},
    )
    assert_equal(success.returncode, 0, "push_swap past-last malloc succeeds")

    for index in range(1, 8):
        result = run(
            CHECKER,
            ["2", "1"],
            b"sa\n",
            faults={"PS_FAIL_MALLOC_AT": index},
        )
        assert_true(result.returncode != 0, f"checker malloc #{index} fails")
        assert_equal(result.stderr, b"Error\n", "checker allocation error")
    success = run(
        CHECKER,
        ["2", "1"],
        b"sa\n",
        faults={"PS_FAIL_MALLOC_AT": 8},
    )
    assert_equal(success.returncode, 0, "checker past-last malloc succeeds")
    assert_equal(success.stdout, b"OK\n", "checker succeeds after allocation sweep")


def test_read_failures_and_command_bounds():
    for index in range(1, 5):
        result = run(
            CHECKER,
            ["2", "1"],
            b"sa\n",
            faults={"PS_FAIL_READ_AT": index},
        )
        assert_true(result.returncode != 0, f"checker read #{index} fails")
        assert_equal(result.stderr, b"Error\n", "checker read error")
    for index in (1, 4):
        result = run(
            CHECKER,
            ["2", "1"],
            b"sa\n",
            faults={"PS_EINTR_READ_AT": index},
        )
        assert_equal(result.returncode, 0, f"checker retries read EINTR #{index}")
        assert_equal(result.stdout, b"OK\n", "checker result after read EINTR")

    invalid_streams = [
        b"sa\x00pb\n",
        b"rrrr\n",
        b"rrrr",
        b"\x00\n",
        b"\n",
        b"r" * 65536 + b"\n",
    ]
    for stream in invalid_streams:
        result = run(CHECKER, ["2", "1"], stream)
        assert_true(result.returncode != 0, f"checker rejects {stream!r}")
        assert_equal(result.stdout, b"", "invalid command has no stdout")
        assert_equal(result.stderr, b"Error\n", "invalid command reports Error")

    unterminated = run(CHECKER, ["2", "1"], b"sa")
    assert_equal(unterminated.returncode, 0, "unterminated valid command succeeds")
    assert_equal(unterminated.stdout, b"OK\n", "unterminated command is applied")


def test_write_failures():
    baseline = run(PUSH_SWAP, ["3", "2", "1"])
    assert_equal(baseline.returncode, 0, "push_swap baseline succeeds")
    write_count = len(baseline.stdout.splitlines())
    assert_true(write_count >= 2, "write fault fixture emits multiple commands")
    for index in range(1, write_count + 1):
        result = run(
            PUSH_SWAP,
            ["3", "2", "1"],
            faults={"PS_FAIL_WRITE_AT": index},
        )
        assert_true(result.returncode != 0, f"push_swap write #{index} fails")
        assert_equal(result.stderr, b"Error\n", "push_swap write error")

    for fault in ("PS_EINTR_WRITE_AT", "PS_SHORT_WRITE_AT"):
        result = run(PUSH_SWAP, ["3", "2", "1"], faults={fault: 1})
        assert_equal(result.returncode, 0, f"push_swap handles {fault}")
        assert_equal(result.stdout, baseline.stdout, f"{fault} preserves command stream")

    zero = run(PUSH_SWAP, ["3", "2", "1"], faults={"PS_ZERO_WRITE_AT": 1})
    assert_true(zero.returncode != 0, "zero-byte write is a permanent failure")
    assert_equal(zero.stderr, b"Error\n", "zero-byte write reports Error")

    partial = run(
        PUSH_SWAP,
        ["3", "2", "1"],
        faults={"PS_SHORT_WRITE_AT": 1, "PS_FAIL_WRITE_AT": 2},
    )
    assert_equal(partial.returncode, 1, "failure after a partial write reaches main")
    assert_equal(partial.stdout, baseline.stdout[:1], "partial prefix is not repeated")
    assert_equal(partial.stderr, b"Error\n", "partial-success failure reports Error")

    checker = run(
        CHECKER,
        ["2", "1"],
        b"sa\n",
        faults={"PS_FAIL_WRITE_AT": 1},
    )
    assert_true(checker.returncode != 0, "checker propagates result write failure")
    assert_equal(checker.stderr, b"Error\n", "checker output failure reports Error")

    error_write_cases = [
        ("push_swap parse error", PUSH_SWAP, ["1", "1"], b""),
        ("checker command error", CHECKER, ["1", "2"], b"wat\n"),
    ]
    for label, binary, args, input_bytes in error_write_cases:
        result = run(
            binary,
            args,
            input_bytes,
            faults={"PS_FAIL_WRITE_AT": 1},
        )
        assert_equal(result.returncode, 1, f"{label} keeps failure status")
        assert_equal(result.stdout, b"", f"{label} has no stdout")
        assert_equal(result.stderr, b"", f"{label} tolerates Error write failure")

    read_fd, write_fd = os.pipe()
    os.close(read_fd)
    environment = os.environ.copy()
    environment["PS_REPORT_ALLOCATIONS"] = "1"
    process = subprocess.Popen(
        [str(PUSH_SWAP), "3", "2", "1"],
        stdin=subprocess.DEVNULL,
        stdout=write_fd,
        stderr=subprocess.PIPE,
        cwd=ROOT,
        env=environment,
    )
    os.close(write_fd)
    try:
        _, stderr = process.communicate(timeout=3)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        fail("push_swap timed out after its stdout pipe closed")
    assert_equal(process.returncode, 1, "closed stdout is reported by main")
    assert_equal(
        stderr.replace(ALLOCATION_REPORT, b""),
        b"Error\n",
        "closed stdout reports Error instead of dying from SIGPIPE",
    )
    assert_true(ALLOCATION_REPORT in stderr, "closed stdout path releases allocations")


def main():
    test_nth_allocation_failures()
    test_read_failures_and_command_bounds()
    test_write_failures()
    print("fault injection tests passed")


if __name__ == "__main__":
    main()
