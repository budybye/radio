#!/usr/bin/env bash
set -euo pipefail
PORT="${MPD_STUB_PORT:-18080}"
PID_FILE="${TMPDIR:-/tmp}/radio-mpd-stub.${PORT}.pid"
if [[ -f "$PID_FILE" ]]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "mpd-stub stopped"
else
  echo "mpd-stub not running"
fi
