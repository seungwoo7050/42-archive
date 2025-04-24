#!/bin/sh

set -eu

if [ "$#" -eq 0 ] || [ "$(/usr/bin/uname -s)" != "Darwin" ]
then
    printf 'Mach-O 의존성 검사는 macOS 실행 파일이 필요합니다.\n' >&2
    exit 2
fi

temporary_directory=$(/usr/bin/mktemp -d \
    "${TMPDIR:-/tmp}/cpp-foundation-dependencies.XXXXXX")

cleanup()
{
    /bin/rm -f "$temporary_directory/libraries"
    /bin/rmdir "$temporary_directory"
}

trap cleanup EXIT HUP INT TERM

for binary in "$@"
do
    if [ ! -x "$binary" ]
    then
        printf '실행 파일을 찾을 수 없습니다: %s\n' "$binary" >&2
        exit 2
    fi
    /usr/bin/otool -L "$binary" |
        /usr/bin/awk 'NR > 1 { print $1 }' |
        LC_ALL=C /usr/bin/sort -u > "$temporary_directory/libraries"
    if ! /usr/bin/diff -u tests/manifests/macho-libraries.manifest \
        "$temporary_directory/libraries"
    then
        printf '허용되지 않은 Mach-O 의존성: %s\n' "$binary" >&2
        exit 1
    fi
    if /usr/bin/otool -l "$binary" |
        /usr/bin/awk '$1 == "cmd" && $2 == "LC_RPATH" { found = 1 }
            END { exit found ? 0 : 1 }'
    then
        printf 'LC_RPATH를 포함한 실행 파일: %s\n' "$binary" >&2
        exit 1
    fi
done
