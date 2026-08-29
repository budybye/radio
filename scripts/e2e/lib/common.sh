#!/usr/bin/env bash
set -euo pipefail

# Tier: workers | prod
# - workers: radio.*.workers.dev (after bun run deploy)
# - prod:    custom domain — read-only smoke (RADIO_E2E_PROD_URL)

radio_e2e_default_base_url() {
  case "${RADIO_E2E_TIER:-workers}" in
    workers)
      if [[ -n "${RADIO_E2E_WORKERS_URL:-}" ]]; then
        echo "${RADIO_E2E_WORKERS_URL}"
      elif [[ -n "${RADIO_E2E_PREVIEW_URL:-}" ]]; then
        # legacy alias
        echo "${RADIO_E2E_PREVIEW_URL}"
      else
        echo "https://radio.${CLOUDFLARE_ACCOUNT_SUBDOMAIN:-<account>}.workers.dev"
      fi
      ;;
    prod)
      if [[ -n "${RADIO_E2E_BASE_URL:-}" ]]; then
        echo "${RADIO_E2E_BASE_URL}"
      elif [[ -n "${RADIO_E2E_PROD_URL:-}" ]]; then
        echo "${RADIO_E2E_PROD_URL}"
      else
        echo "Set RADIO_E2E_PROD_URL or RADIO_E2E_BASE_URL for prod tier" >&2
        return 1
      fi
      ;;
    *)
      echo "unknown RADIO_E2E_TIER: ${RADIO_E2E_TIER} (use workers | prod)" >&2
      return 1
      ;;
  esac
}

radio_e2e_resolve_base_url() {
  local base="${RADIO_E2E_BASE_URL:-$(radio_e2e_default_base_url)}"
  base="${base%/}"
  printf '%s' "$base"
}

radio_e2e_guard_tier() {
  local tier="${RADIO_E2E_TIER:-workers}"
  local base
  base="$(radio_e2e_resolve_base_url)"

  case "$tier" in
    prod)
      if [[ "${RADIO_E2E_ALLOW_PROD:-}" != "1" ]]; then
        echo "Refusing prod E2E without RADIO_E2E_ALLOW_PROD=1 (base=$base)" >&2
        exit 2
      fi
      if [[ "${RADIO_E2E_WRITE:-}" == "1" ]]; then
        echo "Refusing write-mode prod E2E (read-only smoke only)" >&2
        exit 2
      fi
      ;;
    workers|preview)
      # preview: legacy tier name → workers
      if [[ "$tier" == "preview" ]]; then
        tier=workers
      fi
      if [[ "$base" != *".workers.dev"* ]]; then
        echo "workers tier expects *.workers.dev base URL (got $base)" >&2
        exit 2
      fi
      ;;
    local)
      echo "local tier removed — use workers tier (radio.*.workers.dev) or vitest + mpd-stub contract" >&2
      exit 2
      ;;
    *)
      echo "unknown RADIO_E2E_TIER=$tier" >&2
      exit 2
      ;;
  esac

  export RADIO_E2E_TIER="$tier"
  export RADIO_E2E_BASE_URL="$base"
}

radio_e2e_require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
}

radio_e2e_log() {
  printf '[e2e] %s\n' "$*"
}

# shellcheck source=scripts/e2e/lib/contract.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/contract.sh"

radio_e2e_assert_home_html() {
  local html="$1"
  case "${RADIO_E2E_TIER:-workers}" in
    workers|preview) radio_e2e_assert_inertia_shell_html "$html" ;;
    prod) radio_e2e_assert_inertia_shell_html "$html" ;;
    *)
      echo "unknown RADIO_E2E_TIER=${RADIO_E2E_TIER}" >&2
      exit 2
      ;;
  esac
}

radio_e2e_asserts_fixture_values() {
  false
}
