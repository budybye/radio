#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck source=scripts/e2e/lib/common.sh
source "$ROOT/scripts/e2e/lib/common.sh"

radio_e2e_guard_tier
radio_e2e_require_cmd opencli

BASE="${RADIO_E2E_BASE_URL%/}"
SESSION="${RADIO_E2E_OPENCLI_SESSION:-radio-e2e}"
WINDOW="${RADIO_E2E_OPENCLI_WINDOW:-background}"

radio_e2e_log "tier=${RADIO_E2E_TIER} base=$BASE session=$SESSION"

opencli browser "$SESSION" close || true
opencli browser "$SESSION" open "$BASE/" --window "$WINDOW"
opencli browser "$SESSION" wait text "Listeners" --timeout 30000

listeners_json="$(opencli browser "$SESSION" find --text "Listeners")"
if ! printf '%s' "$listeners_json" | grep -q '"matches_n"'; then
  echo "FAIL: opencli could not find Listeners label" >&2
  echo "$listeners_json" >&2
  opencli browser "$SESSION" close || true
  exit 1
fi

speaker_class="$(node -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).ui.speakerClass)' "$ROOT/workers/test/fixtures/mpd/contract.json")"
speakers_json="$(opencli browser "$SESSION" find --css ".${speaker_class}")"
if ! printf '%s' "$speakers_json" | grep -q '"matches_n"'; then
  echo "FAIL: opencli could not find globe speaker (.${speaker_class})" >&2
  echo "$speakers_json" >&2
  opencli browser "$SESSION" close || true
  exit 1
fi

ui_metrics="$(opencli browser "$SESSION" eval 'JSON.stringify((()=>{const reachable=(selector)=>{const e=document.querySelector(selector);if(!e)return false;e.scrollIntoView({block:"center",behavior:"instant"});const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.left>=0&&r.right<=innerWidth};const root=document.documentElement;const controls=["[role=\"radiogroup\"]",".globe-speaker","#now-playing-title","button[aria-label=\"Play live stream\"],button[aria-label=\"Stop playback\"]","button[aria-label=\"Mute stream\"],button[aria-label=\"Unmute stream\"]","input[aria-label=\"Volume\"]"].map(selector=>({selector,reachable:reachable(selector)}));scrollTo(0,0);return {viewport:{width:innerWidth,height:innerHeight},scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,controls}})())')"
node -e 'const m=JSON.parse(process.argv[1]); if (m.scrollWidth>m.clientWidth) throw new Error(`horizontal overflow at ${m.viewport.width}x${m.viewport.height}`); for(const c of m.controls) if(!c.reachable) throw new Error(`unreachable UI: ${c.selector} at ${m.viewport.width}x${m.viewport.height}`); console.log(`[e2e] layout ${m.viewport.width}x${m.viewport.height}: no horizontal overflow; primary UI reachable`)' "$ui_metrics"

radio_e2e_log "PASS: responsive layout assertions"

radio_e2e_log "workers/prod tier: structural UI only (no fixture artist/count assertions)"

opencli browser "$SESSION" close || true
radio_e2e_log "PASS: opencli Home UI smoke (tier=${RADIO_E2E_TIER})"
