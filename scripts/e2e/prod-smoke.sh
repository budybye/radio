#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/e2e/lib/common.sh
source "$(cd "$(dirname "$0")/lib" && pwd)/common.sh"
radio_e2e_load_root_env "$ROOT"
export RADIO_E2E_TIER=prod
export RADIO_E2E_ALLOW_PROD=1
if [[ -z "${RADIO_E2E_BASE_URL:-}" && -z "${RADIO_E2E_PROD_URL:-}" ]]; then
  echo "Set RADIO_E2E_PROD_URL=https://your-domain.com (or RADIO_E2E_BASE_URL)" >&2
  exit 1
fi
export RADIO_E2E_BASE_URL="${RADIO_E2E_BASE_URL:-$RADIO_E2E_PROD_URL}"

bash "$ROOT/scripts/e2e/http-smoke.sh"
