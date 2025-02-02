#!/bin/sh

set -eu

archive=${1:-libbuffered_line_reader.a}
header=${2:-get_next_line.h}
source=${3:-tests/smoke/consumer.c}
compiler=${CC:-cc}
temporary_dir=$(mktemp -d)
trap 'rm -rf "$temporary_dir"' EXIT HUP INT TERM

mkdir -p "$temporary_dir/include" "$temporary_dir/lib"
cp "$header" "$temporary_dir/include/get_next_line.h"
cp "$archive" "$temporary_dir/lib/libbuffered_line_reader.a"
cp "$source" "$temporary_dir/consumer.c"
printf 'outside\narchive' >"$temporary_dir/input.txt"

"$compiler" -Wall -Wextra -Werror -Wpedantic -std=c99 \
	-I"$temporary_dir/include" "$temporary_dir/consumer.c" \
	"$temporary_dir/lib/libbuffered_line_reader.a" \
	-o "$temporary_dir/consumer"

"$temporary_dir/consumer" "$temporary_dir/input.txt"
