#!/bin/sh

set -eu

project_root=$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd -P)
scratch=$(mktemp -d "${TMPDIR:-/tmp}/libft-compilers.XXXXXX")

cleanup()
{
	rm -rf "$scratch"
}

trap cleanup EXIT HUP INT TERM

find_clang()
{
	for candidate in ${CLANG:-} clang cc gcc
	do
		if ! command -v "$candidate" >/dev/null 2>&1
		then
			continue
		fi
		version=$("$candidate" --version 2>/dev/null | sed -n '1p')
		case "$version" in
			*clang* | *Clang*)
				printf '%s\n' "$candidate"
				return
				;;
		esac
	done
	return 1
}

find_gcc()
{
	for candidate in ${GCC:-} gcc-15 gcc-14 gcc-13 gcc-12 gcc-11 gcc
	do
		if ! command -v "$candidate" >/dev/null 2>&1
		then
			continue
		fi
		version=$("$candidate" --version 2>/dev/null | sed -n '1p')
		case "$version" in
			*clang* | *Clang*)
				continue
				;;
			*gcc* | *GCC* | *"Free Software Foundation"*)
				printf '%s\n' "$candidate"
				return
				;;
		esac
	done
	return 1
}

run_suite()
{
	label=$1
	compiler=$2
	work=$scratch/$label

	mkdir -p "$work"
	cp "$project_root/Makefile" "$project_root/libft.h" "$work/"
	cp -R "$project_root/src" "$project_root/tests" "$work/"
	printf 'compiler check: %s (%s)\n' "$label" \
		"$("$compiler" --version | sed -n '1p')"
	make -s -C "$work" CC="$compiler" fclean
	make -s -C "$work" CC="$compiler" all test failure-test \
		write-failure-test check-archive
}

clang_compiler=$(find_clang || true)
gcc_compiler=$(find_gcc || true)

if [ -z "$clang_compiler" ]
then
	echo "Clang compiler not found" >&2
	exit 1
fi
if [ -z "$gcc_compiler" ]
then
	echo "GNU GCC compiler not found" >&2
	exit 1
fi

run_suite clang "$clang_compiler"
run_suite gcc "$gcc_compiler"
