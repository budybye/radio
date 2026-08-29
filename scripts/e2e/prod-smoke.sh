#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f "$ROOT/.env.production" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env.production"
  set +a
fi
export RADIO_E2E_TIER=prod
export RADIO_E2E_ALLOW_PROD=1
if [[ -z "${RADIO_E2E_BASE_URL:-}" && -z "${RADIO_E2E_PROD_URL:-}" ]]; then
  echo "Set RADIO_E2E_PROD_URL=https://your-domain.com (or RADIO_E2E_BASE_URL)" >&2
  exit 1
fi
export RADIO_E2E_BASE_URL="${RADIO_E2E_BASE_URL:-$RADIO_E2E_PROD_URL}"

bash "$ROOT/scripts/e2e/http-smoke.sh"
