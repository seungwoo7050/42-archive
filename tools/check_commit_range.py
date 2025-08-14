#!/usr/bin/env python3
"""현재 실행을 유발한 커밋 범위의 공백 오류를 검사합니다."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys


OBJECT_ID = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")


def git(*arguments: str, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *arguments],
        check=True,
        text=True,
        capture_output=capture,
    )


def fallback_base() -> str:
    return git("rev-parse", "HEAD^", capture=True).stdout.strip()


def select_base(requested: str) -> str:
    if not requested or set(requested) == {"0"}:
        return fallback_base()
    if not OBJECT_ID.fullmatch(requested):
        raise ValueError("기준 커밋 해시 형식이 올바르지 않습니다")

    available = subprocess.run(
        ["git", "cat-file", "-e", f"{requested}^{{commit}}"],
        text=True,
        capture_output=True,
    )
    if available.returncode == 0:
        return requested

    print(
        f"요청한 기준 커밋을 찾을 수 없어 HEAD^를 검사합니다: {requested}",
        file=sys.stderr,
    )
    return fallback_base()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CI 커밋 범위 공백 검사")
    parser.add_argument("--base", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_arguments()
    try:
        base = select_base(args.base)
        head = git("rev-parse", "HEAD", capture=True).stdout.strip()
        git("diff", "--check", base, head)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"커밋 범위 검사 실패: {error}", file=sys.stderr)
        return 1
    print(f"커밋 범위 공백 검사 통과: {base}..{head}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
