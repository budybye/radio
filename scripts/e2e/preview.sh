#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/e2e/lib/common.sh
source "$(cd "$(dirname "$0")/lib" && pwd)/common.sh"
radio_e2e_load_root_env "$ROOT"
export RADIO_E2E_TIER=workers

if [[ -z "${RADIO_E2E_WORKERS_URL:-}" && -z "${RADIO_E2E_PREVIEW_URL:-}" ]]; then
  echo "Set RADIO_E2E_WORKERS_URL=https://radio.<account>.workers.dev" >&2
  exit 1
fi
export RADIO_E2E_BASE_URL="${RADIO_E2E_WORKERS_URL:-$RADIO_E2E_PREVIEW_URL}"

echo "== E2E tier: workers (radio.*.workers.dev) =="
echo "   HTTP: Inertia shell. opencli: hydrated LISTENERS + globe-speaker."
echo "   Deploy: cd workers && bun run deploy"
echo ""

bash "$ROOT/scripts/e2e/http-smoke.sh"
if command -v opencli >/dev/null 2>&1; then
  bash "$ROOT/scripts/e2e/opencli-home.sh"
fi
