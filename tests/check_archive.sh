#!/bin/sh

set -eu

archive=${1:-libft.a}
output_dir=build/archive-check
compiler=${CC:-cc}
project_root=$(pwd -P)
consumer_dir=$(mktemp -d "${TMPDIR:-/tmp}/libft-consumer.XXXXXX")

cleanup()
{
	rm -rf "$consumer_dir"
}

trap cleanup EXIT HUP INT TERM

case "$archive" in
	/*)
		archive_path=$archive
		;;
	*)
		archive_path=$project_root/$archive
		;;
esac

mkdir -p "$output_dir"

ar t "$archive" | awk '/\.o$/' | sort > "$output_dir/members.actual"
sort tests/archive-members.txt > "$output_dir/members.expected"
cmp "$output_dir/members.expected" "$output_dir/members.actual"

case "$(uname -s)" in
	Darwin)
		nm -gU -j "$archive" > "$output_dir/defined.raw"
		nm -u -j "$archive" > "$output_dir/undefined.raw"
		sed -E 's/^_//' "$output_dir/defined.raw" \
			> "$output_dir/defined.normalized"
		sed -E 's/^_//' "$output_dir/undefined.raw" \
			> "$output_dir/undefined.normalized"
		;;
	Linux)
		nm -g --defined-only -j "$archive" > "$output_dir/defined.raw"
		nm -u -j "$archive" > "$output_dir/undefined.raw"
		cat "$output_dir/defined.raw" > "$output_dir/defined.normalized"
		cat "$output_dir/undefined.raw" > "$output_dir/undefined.normalized"
		;;
	*)
		echo "unsupported symbol tool platform" >&2
		exit 1
		;;
esac

awk '/^[A-Za-z_][A-Za-z0-9_]*$/' "$output_dir/defined.normalized" \
	| sort > "$output_dir/symbols.actual"
sort tests/api-symbols.txt > "$output_dir/symbols.expected"
cmp "$output_dir/symbols.expected" "$output_dir/symbols.actual"

awk '/^[A-Za-z_][A-Za-z0-9_]*$/' "$output_dir/undefined.normalized" \
	| sort -u \
	> "$output_dir/undefined.all"
comm -23 "$output_dir/undefined.all" "$output_dir/symbols.expected" \
	> "$output_dir/undefined.external"
{
	cat tests/allowed-undefined.txt
	case "$(uname -s)" in
		Darwin)
			printf '%s\n' __error
			;;
		Linux)
			printf '%s\n' __errno_location
			;;
	esac
} | sort > "$output_dir/undefined.expected"
cmp "$output_dir/undefined.expected" "$output_dir/undefined.external"

cp tests/smoke/consumer.c "$consumer_dir/consumer.c"
(
	cd "$consumer_dir"
	"$compiler" -I"$project_root" -Wall -Wextra -Werror -Wpedantic \
		-std=c99 -fno-builtin consumer.c "$archive_path" -o consumer
	./consumer
)
