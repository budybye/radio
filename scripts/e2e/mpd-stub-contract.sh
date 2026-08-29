#!/usr/bin/env bash
# Contract: local mpd-stub serves fixture status/currentsong/ping without external network.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${MPD_STUB_PORT:-18080}"
HOST="${MPD_STUB_HOST:-127.0.0.1}"
BASE="http://${HOST}:${PORT}"

EXPECTED_LISTENERS="$(node "$ROOT/workers/test/read-contract.mjs" status.listeners)"
EXPECTED_STATE="$(node "$ROOT/workers/test/read-contract.mjs" status.state)"
EXPECTED_ARTIST="$(node "$ROOT/workers/test/read-contract.mjs" currentsong.Artist)"

node "$ROOT/workers/test/mpd-stub.mjs" &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -fsS "${BASE}/mpd.cgi?cmd=ping" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

ping="$(curl -fsS "${BASE}/mpd.cgi?cmd=ping")"
if [[ "$ping" != *'"ok":true'* ]]; then
  echo "FAIL: mpd-stub ping response missing ok:true" >&2
  echo "$ping" >&2
  exit 1
fi

status="$(curl -fsS "${BASE}/mpd.cgi?cmd=status")"
if [[ "$status" != *"listeners: ${EXPECTED_LISTENERS}"* ]]; then
  echo "FAIL: mpd-stub status missing listeners: ${EXPECTED_LISTENERS}" >&2
  echo "$status" >&2
  exit 1
fi
if [[ "$status" != *"state: ${EXPECTED_STATE}"* ]]; then
  echo "FAIL: mpd-stub status missing state: ${EXPECTED_STATE}" >&2
  exit 1
fi

song="$(curl -fsS "${BASE}/mpd.cgi?cmd=currentsong")"
if [[ "$song" != *"${EXPECTED_ARTIST}"* ]]; then
  echo "FAIL: mpd-stub currentsong missing ${EXPECTED_ARTIST}" >&2
  echo "$song" >&2
  exit 1
fi

echo "PASS: mpd-stub HTTP contract (ping, status listeners=${EXPECTED_LISTENERS}, currentsong artist)"
