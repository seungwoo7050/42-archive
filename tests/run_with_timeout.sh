#!/bin/sh

set -u

if [ "$#" -lt 2 ]
then
    printf '제한 시간과 실행할 명령이 필요합니다.\n' >&2
    exit 2
fi

case $1 in
    ''|*[!0-9]*)
        printf '제한 시간은 양의 정수여야 합니다.\n' >&2
        exit 2
        ;;
esac
if [ "$1" -eq 0 ]
then
    printf '제한 시간은 양의 정수여야 합니다.\n' >&2
    exit 2
fi

limit_seconds=$1
shift
temporary_directory=$(mktemp -d \
    "${TMPDIR:-/tmp}/cpp-foundation-timeout.XXXXXX") || exit 2
timeout_marker=$temporary_directory/timed-out
child_pid=
watchdog_pid=

cleanup()
{
    if [ -n "$watchdog_pid" ]
    then
        kill "$watchdog_pid" 2>/dev/null || true
        wait "$watchdog_pid" 2>/dev/null || true
    fi
    if [ -n "$child_pid" ]
    then
        kill "$child_pid" 2>/dev/null || true
        wait "$child_pid" 2>/dev/null || true
    fi
    rm -f "$timeout_marker"
    rmdir "$temporary_directory"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

started_at=$(date +%s)
"$@" &
child_pid=$!

(
    sleep "$limit_seconds"
    if kill -0 "$child_pid" 2>/dev/null
    then
        : > "$timeout_marker"
        kill -TERM "$child_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$child_pid" 2>/dev/null || true
    fi
) &
watchdog_pid=$!

if wait "$child_pid"
then
    command_status=0
else
    command_status=$?
fi
child_pid=
kill "$watchdog_pid" 2>/dev/null || true
wait "$watchdog_pid" 2>/dev/null || true
watchdog_pid=
finished_at=$(date +%s)
wall_seconds=$((finished_at - started_at))

printf 'wall_seconds=%s timeout_seconds=%s command=%s\n' \
    "$wall_seconds" "$limit_seconds" "$1"

if [ -f "$timeout_marker" ]
then
    printf '제한 시간을 초과했습니다: %s초\n' "$limit_seconds" >&2
    exit 124
fi
exit "$command_status"
