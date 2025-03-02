#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TEST_TMP=$(mktemp -d "${TMPDIR:-/tmp}/signal-message-bus-session.XXXXXX")
OUT="$TEST_TMP/server.out"
SERVER_ERR="$TEST_TMP/server.err"
CLIENT_ERR="$TEST_TMP/client.err"
BUSY_ERR="$TEST_TMP/busy.err"
EXPECTED_BUSY="$TEST_TMP/expected-busy.err"
EXPECTED="$TEST_TMP/expected.out"
READY="$TEST_TMP/ready.out"
UNREAPED_READY="$TEST_TMP/unreaped-ready.out"
BEFORE_BUSY="$TEST_TMP/before-busy.out"
SERVER_PID=
HOLDER_PID=
UNREAPED_PARENT_PID=

cleanup()
{
	if [ -n "$UNREAPED_PARENT_PID" ]; then
		kill "$UNREAPED_PARENT_PID" 2>/dev/null || true
		wait "$UNREAPED_PARENT_PID" 2>/dev/null || true
	fi
	if [ -n "$HOLDER_PID" ]; then
		kill "$HOLDER_PID" 2>/dev/null || true
		wait "$HOLDER_PID" 2>/dev/null || true
	fi
	if [ -n "$SERVER_PID" ]; then
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi
	rm -rf "$TEST_TMP"
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

server_ready()
{
	[ -f "$OUT" ] || return 1
	[ "$(wc -l <"$OUT")" -ge 1 ] &&
	[ "$(sed -n '1p' "$OUT")" = "$SERVER_PID" ]
}

"$ROOT/server" >"$OUT" 2>"$SERVER_ERR" &
SERVER_PID=$!

tries=0
while [ "$tries" -lt 50 ]; do
	if server_ready; then
		break
	fi
	tries=$((tries + 1))
	sleep 0.1
done
if ! server_ready; then
	printf 'server did not publish its complete pid line\n' >&2
	exit 1
fi

"$ROOT/client" "$SERVER_PID" "complete" 2>>"$CLIENT_ERR"

"$ROOT/tests/session_sender" "$SERVER_PID" bit
if ! "$ROOT/client" "$SERVER_PID" "bit recovered" 2>>"$CLIENT_ERR"; then
	printf 'server did not recover a bit-only abandoned session\n' >&2
	cat "$CLIENT_ERR" >&2
	exit 1
fi

"$ROOT/tests/session_sender" "$SERVER_PID" partial
if ! "$ROOT/client" "$SERVER_PID" "line recovered" 2>>"$CLIENT_ERR"; then
	printf 'server did not recover a partial-line abandoned session\n' >&2
	cat "$CLIENT_ERR" >&2
	exit 1
fi

: >"$READY"
"$ROOT/tests/session_sender" "$SERVER_PID" reserve >"$READY" &
HOLDER_PID=$!
tries=0
while [ "$tries" -lt 50 ]; do
	if grep -qx 'ready' "$READY"; then
		break
	fi
	if ! kill -0 "$HOLDER_PID" 2>/dev/null; then
		printf 'session reserver exited before becoming ready\n' >&2
		exit 1
	fi
	tries=$((tries + 1))
	sleep 0.1
done
if ! grep -qx 'ready' "$READY"; then
	printf 'session reserver did not become ready\n' >&2
	exit 1
fi

cp "$OUT" "$BEFORE_BUSY"
if "$ROOT/client" "$SERVER_PID" "blocked" 2>"$BUSY_ERR"; then
	printf 'server accepted a competitor while the owner was alive\n' >&2
	exit 1
fi
printf 'client: server is busy with another sender\n' >"$EXPECTED_BUSY"
diff -u "$EXPECTED_BUSY" "$BUSY_ERR"
diff -u "$BEFORE_BUSY" "$OUT"

kill "$HOLDER_PID"
wait "$HOLDER_PID" 2>/dev/null || true
HOLDER_PID=
if ! "$ROOT/client" "$SERVER_PID" "reservation recovered" 2>>"$CLIENT_ERR"; then
	printf 'server did not recover after the live reserved owner exited\n' >&2
	cat "$CLIENT_ERR" >&2
	exit 1
fi

: >"$UNREAPED_READY"
"$ROOT/tests/unreaped_exec" "$ROOT/tests/session_sender" "$SERVER_PID" \
	>"$UNREAPED_READY" &
UNREAPED_PARENT_PID=$!
tries=0
while [ "$tries" -lt 50 ] && [ ! -s "$UNREAPED_READY" ]; do
	if ! kill -0 "$UNREAPED_PARENT_PID" 2>/dev/null; then
		printf 'unreaped owner helper exited before readiness\n' >&2
		exit 1
	fi
	tries=$((tries + 1))
	sleep 0.1
done
UNREAPED_OWNER_PID=$(sed -n '1p' "$UNREAPED_READY")
case "$UNREAPED_OWNER_PID" in
	''|*[!0-9]*)
		printf 'unreaped owner helper did not publish a pid\n' >&2
		exit 1
		;;
esac
kill -0 "$UNREAPED_OWNER_PID"
if ! "$ROOT/client" "$SERVER_PID" "unreaped recovered" 2>>"$CLIENT_ERR"; then
	printf 'server did not recover while the exited owner was unreaped\n' >&2
	cat "$CLIENT_ERR" >&2
	exit 1
fi
kill "$UNREAPED_PARENT_PID"
wait "$UNREAPED_PARENT_PID"
UNREAPED_PARENT_PID=

masked_status=0
"$ROOT/tests/masked_exec" "$ROOT/client" "$SERVER_PID" "masked ack" \
	2>>"$CLIENT_ERR" || masked_status=$?
if [ "$masked_status" -ne 0 ]; then
	printf 'client did not consume acknowledgements inherited as blocked\n' >&2
	exit 1
fi

if [ -s "$CLIENT_ERR" ]; then
	printf 'recovered client wrote to stderr\n' >&2
	cat "$CLIENT_ERR" >&2
	exit 1
fi
if [ -s "$SERVER_ERR" ]; then
	printf 'server wrote to stderr\n' >&2
	cat "$SERVER_ERR" >&2
	exit 1
fi

{
	printf '%s\n' "$SERVER_PID"
	printf 'complete\n'
	printf 'bit recovered\n'
	printf 'X\n'
	printf 'line recovered\n'
	printf 'reservation recovered\n'
	printf 'X\n'
	printf 'unreaped recovered\n'
	printf 'masked ack\n'
} >"$EXPECTED"

diff -u "$EXPECTED" "$OUT"
