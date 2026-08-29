#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export RADIO_E2E_TIER=preview

if [[ -z "${RADIO_E2E_PREVIEW_URL:-}" ]]; then
  echo "Set RADIO_E2E_PREVIEW_URL=https://radio.<account>.workers.dev" >&2
  exit 1
fi
export RADIO_E2E_BASE_URL="$RADIO_E2E_PREVIEW_URL"

echo "== E2E tier: preview (*.workers.dev) =="
echo "   HTTP: Inertia shell only. opencli: hydrated LISTENERS + globe-speaker."
echo "   Deploy: cd workers && bun run deploy   # or wrangler deploy --config wrangler.jsonc"
echo "   Set RADIO_E2E_PREVIEW_URL to your *.workers.dev origin."
echo ""

bash "$ROOT/scripts/e2e/http-smoke.sh"
if command -v opencli >/dev/null 2>&1; then
  bash "$ROOT/scripts/e2e/opencli-home.sh"
fi
