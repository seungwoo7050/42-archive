#!/bin/sh

set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]
then
    printf '검사할 정적 라이브러리가 필요합니다.\n' >&2
    exit 2
fi
if [ "$(/usr/bin/uname -s)" != "Darwin" ]
then
    printf '정적 라이브러리 검사는 macOS가 필요합니다.\n' >&2
    exit 2
fi

archive=$1
temporary_directory=$(/usr/bin/mktemp -d \
    "${TMPDIR:-/tmp}/cpp-foundation-archive.XXXXXX")

cleanup()
{
    /bin/rm -f "$temporary_directory/members" \
        "$temporary_directory/symbols"
    /bin/rmdir "$temporary_directory"
}

trap cleanup EXIT HUP INT TERM

/usr/bin/ar -t "$archive" |
    /usr/bin/awk '$0 != "__.SYMDEF" && $0 != "__.SYMDEF SORTED"' \
    > "$temporary_directory/members"
if ! /usr/bin/diff -u tests/manifests/archive-members.manifest \
    "$temporary_directory/members"
then
    printf 'archive 객체 구성이 manifest와 다릅니다.\n' >&2
    exit 1
fi

LC_ALL=C
export LC_ALL
/usr/bin/nm -gUWj "$archive" |
    /usr/bin/c++filt |
    /usr/bin/awk 'NF && substr($0, length($0), 1) != ":"' |
    /usr/bin/sed -E 's/std::__[[:alnum:]_]+::/std::/g' |
    /usr/bin/sort -u > "$temporary_directory/symbols"
if ! /usr/bin/diff -u tests/manifests/archive-symbols.manifest \
    "$temporary_directory/symbols"
then
    printf 'archive 외부 심볼이 manifest와 다릅니다.\n' >&2
    exit 1
fi
