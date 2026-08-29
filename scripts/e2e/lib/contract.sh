#!/usr/bin/env bash
# mpd-stub fixture contract helpers (workers/test/fixtures/mpd/contract.json)

E2E_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

radio_e2e_contract_get() {
  local path="$1"
  node "$E2E_REPO_ROOT/workers/test/read-contract.mjs" "$path"
}

radio_e2e_assert_local_fixture_html() {
  local html="$1"
  local listeners artist title speaker title_fallback

  listeners="$(radio_e2e_contract_get status.listeners)"
  artist="$(radio_e2e_contract_get currentsong.Artist)"
  title="$(radio_e2e_contract_get currentsong.Title)"
  speaker="$(radio_e2e_contract_get ui.speakerClass)"
  title_fallback="$(radio_e2e_contract_get ui.titleFallback)"

  if ! printf '%s' "$html" | grep -q "text-accent\">${listeners}<"; then
    echo "FAIL: Home SSR missing listener count ${listeners} (is MPC_BRIDGE_BASE_URL set?)" >&2
    echo "Hint: bash scripts/e2e/start-mpd-stub.sh" >&2
    echo "      cd workers && MPC_BRIDGE_BASE_URL=http://127.0.0.1:18080 bun run dev" >&2
    exit 1
  fi
  radio_e2e_log "OK: SSR listener count ${listeners}"

  for needle in "$speaker" "$title_fallback"; do
    if [[ "$html" != *"$needle"* ]]; then
      echo "FAIL: Home HTML missing structural marker '$needle'" >&2
      exit 1
    fi
  done

  if [[ "$html" == *"$artist"* && "$html" == *"$title"* ]]; then
    radio_e2e_log "OK: SSR includes fixture song metadata"
  else
    radio_e2e_log "NOTE: fixture song not in SSR yet (DO poll pending); opencli verifies live update"
  fi
}

radio_e2e_assert_inertia_shell_html() {
  local html="$1"
  local title_fallback

  title_fallback="$(radio_e2e_contract_get ui.titleFallback)"

  if [[ "$html" != *'"component":"Home"'* ]]; then
    echo "FAIL: Inertia shell missing Home component" >&2
    exit 1
  fi
  if [[ "$html" != *'"listenerCount"'* ]]; then
    echo "FAIL: Inertia shell missing listenerCount prop" >&2
    exit 1
  fi
  if [[ "$html" != *"$title_fallback"* ]]; then
    echo "FAIL: Inertia shell missing title fallback '$title_fallback'" >&2
    exit 1
  fi

  radio_e2e_log "OK: Inertia shell markers (hydrated UI → opencli)"
}

radio_e2e_assert_structural_html() {
  local html="$1"
  local listeners_label speaker title_fallback

  listeners_label="$(radio_e2e_contract_get ui.listenersLabel)"
  speaker="$(radio_e2e_contract_get ui.speakerClass)"
  title_fallback="$(radio_e2e_contract_get ui.titleFallback)"

  for needle in "$listeners_label" "$speaker" "$title_fallback"; do
    if [[ "$html" != *"$needle"* ]]; then
      echo "FAIL: Home HTML missing structural marker '$needle'" >&2
      exit 1
    fi
  done
  radio_e2e_log "OK: structural Home markers (no fixture value assertions on this tier)"
}
