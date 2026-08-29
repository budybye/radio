#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export RADIO_E2E_TIER="${RADIO_E2E_TIER:-local}"
export RADIO_E2E_BASE_URL="${RADIO_E2E_BASE_URL:-http://127.0.0.1:5173}"

echo "== E2E tier: local (mpd-stub + loopback vp dev) =="
echo "   Fixture values asserted. For workers.dev use: make test-e2e-preview"
echo ""

echo "== Workers unit tests =="
(cd "$ROOT/workers" && bun run test)

echo "== mpd-stub contract =="
bash "$ROOT/scripts/e2e/mpd-stub-contract.sh"

echo "== HTTP smoke (requires vp dev on $RADIO_E2E_BASE_URL + MPC_BRIDGE_BASE_URL) =="
if curl -fsS -o /dev/null "$RADIO_E2E_BASE_URL/" 2>/dev/null; then
  bash "$ROOT/scripts/e2e/http-smoke.sh"
else
  echo "SKIP: dev server not reachable at $RADIO_E2E_BASE_URL"
  echo "Start stack:"
  echo "  bash scripts/e2e/start-mpd-stub.sh"
  echo "  cd workers && MPC_BRIDGE_BASE_URL=http://127.0.0.1:18080 bun run dev"
fi

if command -v opencli >/dev/null 2>&1 && curl -fsS -o /dev/null "$RADIO_E2E_BASE_URL/" 2>/dev/null; then
  echo "== opencli Home smoke (local: stub fixture + DO live update) =="
  bash "$ROOT/scripts/e2e/opencli-home.sh"
else
  echo "SKIP: opencli smoke (missing opencli or dev server)"
fi
