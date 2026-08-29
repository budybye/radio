#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/e2e/lib/common.sh
source "$ROOT/scripts/e2e/lib/common.sh"

radio_e2e_guard_tier
radio_e2e_require_cmd curl

BASE="$(radio_e2e_resolve_base_url)"
radio_e2e_log "tier=${RADIO_E2E_TIER} base=$BASE"

html="$(curl -fsSL "$BASE/")"
status_code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/")"

if [[ "$status_code" != "200" ]]; then
  echo "FAIL: GET / returned HTTP $status_code" >&2
  exit 1
fi

if [[ "${RADIO_E2E_TIER:-local}" == "prod" ]]; then
  radio_e2e_log "OK: prod tier HTTP 200 only (no HTML assertions)"
else
  radio_e2e_assert_home_html "$html"
fi

radio_e2e_log "PASS: Home smoke (HTTP $status_code, tier=${RADIO_E2E_TIER})"
