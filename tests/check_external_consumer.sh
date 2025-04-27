#!/bin/sh

set -eu

if [ "$#" -ne 2 ] || [ ! -f "$2" ]
then
    printf '사용할 C++ 컴파일러와 정적 라이브러리가 필요합니다.\n' >&2
    exit 2
fi

compiler=$1
archive=$2
project_root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
temporary_directory=$(mktemp -d \
    "${TMPDIR:-/tmp}/cpp-foundation-consumer.XXXXXX")

cleanup()
{
    rm -f "$temporary_directory/main.cpp" \
        "$temporary_directory/consumer"
    rmdir "$temporary_directory"
}

trap cleanup EXIT HUP INT TERM

if ! command -v "$compiler" >/dev/null 2>&1
then
    printf 'C++ 컴파일러를 찾을 수 없습니다: %s\n' "$compiler" >&2
    exit 2
fi

cp "$project_root/tests/consumer/external_main.cpp" \
    "$temporary_directory/main.cpp"
"$compiler" -I"$project_root/include" \
    -Wall -Wextra -Werror -Wpedantic -pedantic-errors -std=c++98 \
    -Wold-style-cast -Wcast-qual -Woverloaded-virtual \
    -Wnon-virtual-dtor \
    "$temporary_directory/main.cpp" "$archive" \
    -o "$temporary_directory/consumer"

(
    cd "$temporary_directory"
    ./consumer
)
