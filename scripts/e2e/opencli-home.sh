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
opencli browser "$SESSION" wait text "LISTENERS" --timeout 30000

listeners_json="$(opencli browser "$SESSION" find --text "LISTENERS")"
if ! printf '%s' "$listeners_json" | grep -q '"matches_n"'; then
  echo "FAIL: opencli could not find LISTENERS badge" >&2
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

ui_metrics="$(opencli browser "$SESSION" eval 'JSON.stringify((()=>{const visible=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight};const root=document.documentElement;return {viewport:{width:innerWidth,height:innerHeight},scrollHeight:root.scrollHeight,clientHeight:root.clientHeight,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,selector:visible(document.querySelector("#station-select")),globe:visible(document.querySelector(".globe-speaker")),title:visible(document.querySelector("#now-playing-title")),play:visible(document.querySelector("button[aria-label=\"Play live stream\"],button[aria-label=\"Stop playback\"]"))}})())')"
node -e 'const m=JSON.parse(process.argv[1]); if (m.scrollWidth>m.clientWidth) throw new Error(`horizontal overflow at ${m.viewport.width}x${m.viewport.height}`); if (m.viewport.width>=1024&&m.scrollHeight>m.clientHeight) throw new Error(`desktop vertical overflow at ${m.viewport.width}x${m.viewport.height}`); if (m.viewport.width>=768&&(m.viewport.height<700||m.viewport.width>=1024)&&(!m.selector||!m.globe||!m.title||!m.play)) throw new Error(`primary UI not reachable at ${m.viewport.width}x${m.viewport.height}`); console.log(`[e2e] layout ${m.viewport.width}x${m.viewport.height}: no forbidden overflow; primary UI visible`)' "$ui_metrics"

radio_e2e_log "PASS: responsive layout assertions"

radio_e2e_log "workers/prod tier: structural UI only (no fixture artist/count assertions)"

opencli browser "$SESSION" close || true
radio_e2e_log "PASS: opencli Home UI smoke (tier=${RADIO_E2E_TIER})"
