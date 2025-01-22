#!/bin/sh

set -eu

archive=${1:-libftprintf.a}
include_dir=${2:-include}
consumer_source=${3:-tests/test_consumer.c}
platform=$(uname -s)
compiler_version=$("${CC:-cc}" --version 2>/dev/null | sed -n '1p')
temporary_dir=$(mktemp -d "${TMPDIR:-/tmp}/ftprintf-release.XXXXXX")
definitions="$temporary_dir/definitions"
undefined="$temporary_dir/undefined"
external="$temporary_dir/external"
expected_external="$temporary_dir/expected-external"
expected_definitions="$temporary_dir/expected-definitions"

cleanup()
{
	rm -rf "$temporary_dir"
}

trap cleanup 0 1 2 15
expected_members='ft_printf.o
ft_output.o
ft_parse.o
ft_measure.o
ft_dispatch.o
ft_text.o
ft_numeric_layout.o
ft_number.o
ft_hex.o'
actual_members=$(ar t "$archive" | sed '/^__.SYMDEF/d')

if [ "$actual_members" != "$expected_members" ]; then
	printf '%s\n' "archive member list mismatch" >&2
	exit 1
fi

symbols=$(nm -g "$archive")

normalize_symbols()
{
	if [ "$platform" = "Darwin" ]; then
		sed 's/^_//'
	else
		cat
	fi
}

printf '%s\n' "$symbols" | awk '
	NF >= 3 && $(NF - 1) != "U" { print $NF }
' | normalize_symbols | sort -u > "$definitions"
printf '%s\n' "$symbols" | awk '
	NF >= 2 && $(NF - 1) == "U" { print $NF }
' | normalize_symbols | sort -u > "$undefined"
comm -23 "$undefined" "$definitions" > "$external"
printf '%s\n' \
	"ft_printf" \
	"ft_printf_dispatch" \
	"ft_printf_init" \
	"ft_printf_init_format" \
	"ft_printf_measure" \
	"ft_printf_parse" \
	"ft_printf_print_char" \
	"ft_printf_print_hex" \
	"ft_printf_print_percent" \
	"ft_printf_print_pointer" \
	"ft_printf_print_signed" \
	"ft_printf_print_string" \
	"ft_printf_print_unsigned" \
	"ft_printf_putchar" \
	"ft_printf_putnchar" \
	"ft_printf_write" \
	"ft_printf_write_numeric_layout" \
	| sort -u > "$expected_definitions"

if ! cmp -s "$expected_definitions" "$definitions"; then
	printf '%s\n' "defined global symbol list mismatch" >&2
	diff -u "$expected_definitions" "$definitions" >&2 || true
	exit 1
fi

case "$platform" in
	Darwin)
		printf '%s\n' "__error" "write" > "$expected_external"
		case "$compiler_version" in
			*[Cc][Ll][Aa][Nn][Gg]*)
				printf '%s\n' "__stack_chk_fail" \
					"__stack_chk_guard" >> "$expected_external"
				;;
			*[Gg][Cc][Cc]*|*GNU*)
				;;
			*)
				printf '%s\n' \
					"unsupported Darwin compiler: $compiler_version" >&2
				exit 1
				;;
		esac
		;;
	Linux)
		printf '%s\n' "__errno_location" "write" > "$expected_external"
		;;
	*)
		printf '%s\n' "unsupported symbol inspection platform" >&2
		exit 1
		;;
esac

sort -u "$expected_external" -o "$expected_external"
if ! cmp -s "$expected_external" "$external"; then
	printf '%s\n' "external dependency list mismatch" >&2
	diff -u "$expected_external" "$external" >&2 || true
	exit 1
fi

mkdir "$temporary_dir/include"
cp "$include_dir/ft_printf.h" "$temporary_dir/include/ft_printf.h"
cp "$archive" "$temporary_dir/libftprintf.a"
cp "$consumer_source" "$temporary_dir/consumer.c"
"${CC:-cc}" -Wall -Wextra -Werror -I"$temporary_dir/include" \
	"$temporary_dir/consumer.c" "$temporary_dir/libftprintf.a" \
	-o "$temporary_dir/consumer"
consumer_output=$("$temporary_dir/consumer")
if [ "$consumer_output" != "consumer:17:ok" ]; then
	printf '%s\n' "external consumer output mismatch" >&2
	exit 1
fi

cleanup
trap - 0 1 2 15
if [ -e "$temporary_dir" ]; then
	printf '%s\n' "temporary consumer directory was not removed" >&2
	exit 1
fi

printf '%s\n' "ft_printf release checks passed"
