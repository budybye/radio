#!/usr/bin/env bash
# Deployed E2E: HTTP smoke (workers/test/smoke.ts) + optional opencli hydration.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TIER="${1:?usage: smoke-deployed.sh workers|prod}"
# shellcheck source=scripts/e2e/lib/common.sh
source "$(cd "$(dirname "$0")/lib" && pwd)/common.sh"

radio_e2e_load_root_env "$ROOT"

case "$TIER" in
  workers)
    export RADIO_E2E_TIER=workers
    if [[ -z "${RADIO_E2E_WORKERS_URL:-}" && -z "${RADIO_E2E_PREVIEW_URL:-}" ]]; then
      echo "Set RADIO_E2E_WORKERS_URL=https://radio.<account>.workers.dev" >&2
      exit 1
    fi
    export RADIO_E2E_BASE_URL="${RADIO_E2E_WORKERS_URL:-$RADIO_E2E_PREVIEW_URL}"
    echo "== E2E tier: workers (radio.*.workers.dev) =="
    echo "   HTTP: Inertia shell. opencli: hydrated LISTENERS + globe-speaker."
    echo "   Deploy: cd workers && bun run deploy"
    ;;
  prod)
    export RADIO_E2E_TIER=prod
    export RADIO_E2E_ALLOW_PROD=1
    if [[ -z "${RADIO_E2E_BASE_URL:-}" && -z "${RADIO_E2E_PROD_URL:-}" ]]; then
      echo "Set RADIO_E2E_PROD_URL=https://your-domain.com (or RADIO_E2E_BASE_URL)" >&2
      exit 1
    fi
    export RADIO_E2E_BASE_URL="${RADIO_E2E_BASE_URL:-$RADIO_E2E_PROD_URL}"
    echo "== E2E tier: prod (custom domain, read-only) =="
    ;;
  *)
    echo "unknown tier: $TIER (use workers | prod)" >&2
    exit 1
    ;;
esac

echo ""
(cd "$ROOT/workers" && bun run test:smoke)

if [[ "$TIER" == "workers" ]] && command -v opencli >/dev/null 2>&1; then
  bash "$ROOT/scripts/e2e/opencli-home.sh"
elif [[ "$TIER" == "workers" ]]; then
  echo "opencli not installed — skipping hydrated UI smoke"
fi
