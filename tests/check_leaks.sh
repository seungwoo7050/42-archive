#!/bin/sh

set -eu

if [ "$#" -eq 0 ] || [ "$(/usr/bin/uname -s)" != "Darwin" ] ||
    [ ! -x /usr/bin/leaks ]
then
    printf '누수 검사는 macOS leaks 도구와 실행 파일이 필요합니다.\n' >&2
    exit 2
fi

for binary in "$@"
do
    if [ ! -x "$binary" ]
    then
        printf '누수 검사 실행 파일을 찾을 수 없습니다: %s\n' \
            "$binary" >&2
        exit 2
    fi
    /usr/bin/leaks -q --atExit -- "$binary"
done
