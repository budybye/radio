#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/e2e/lib/common.sh
source "$ROOT/scripts/e2e/lib/common.sh"

radio_e2e_guard_tier
radio_e2e_require_cmd opencli

BASE="$(radio_e2e_resolve_base_url)"
SESSION="${RADIO_E2E_OPENCLI_SESSION:-radio-e2e}"
WINDOW="${RADIO_E2E_OPENCLI_WINDOW:-background}"

radio_e2e_log "tier=${RADIO_E2E_TIER} base=$BASE session=$SESSION"

opencli browser "$SESSION" close || true
opencli browser "$SESSION" open "$BASE/" --window "$WINDOW"
opencli browser "$SESSION" wait text "LISTENERS" --timeout 30000

listeners_json="$(opencli browser "$SESSION" find --text "LISTENERS")"
if ! printf '%s' "$listeners_json" | grep -q '"matches_n"'; then
  echo "FAIL: opencli could not find LISTENERS badge" >&2
  echo "$listeners_json" >&2
  opencli browser "$SESSION" close || true
  exit 1
fi

speaker_class="$(radio_e2e_contract_get ui.speakerClass)"
speakers_json="$(opencli browser "$SESSION" find --css ".${speaker_class}")"
if ! printf '%s' "$speakers_json" | grep -q '"matches_n"'; then
  echo "FAIL: opencli could not find globe speaker (.${speaker_class})" >&2
  echo "$speakers_json" >&2
  opencli browser "$SESSION" close || true
  exit 1
fi

radio_e2e_log "workers/prod tier: structural UI only (no fixture artist/count assertions)"

opencli browser "$SESSION" close || true
radio_e2e_log "PASS: opencli Home UI smoke (tier=${RADIO_E2E_TIER})"
