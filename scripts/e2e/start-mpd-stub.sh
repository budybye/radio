#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${MPD_STUB_PORT:-18080}"
HOST="${MPD_STUB_HOST:-127.0.0.1}"
PID_FILE="${TMPDIR:-/tmp}/radio-mpd-stub.${PORT}.pid"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "mpd-stub already running (pid $(cat "$PID_FILE")) on http://${HOST}:${PORT}"
  exit 0
fi

node "$ROOT/workers/test/mpd-stub.mjs" &
echo $! > "$PID_FILE"
sleep 0.3
echo "mpd-stub started (pid $(cat "$PID_FILE")) — contract: workers/test/fixtures/mpd/contract.json"
echo "Set MPC_BRIDGE_BASE_URL=http://${HOST}:${PORT} in workers/.dev.vars"
