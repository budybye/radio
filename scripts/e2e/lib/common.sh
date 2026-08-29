#!/usr/bin/env bash
set -euo pipefail

# Tier: local | preview | prod
# - local:   Miniflare / vp dev / vp preview on loopback
# - preview: *.workers.dev (deploy with wrangler --env preview)
# - prod:    044g.com custom domain — read-only smoke only

radio_e2e_default_base_url() {
  case "${RADIO_E2E_TIER:-local}" in
    local) echo "http://127.0.0.1:5173" ;;
    preview)
      if [[ -n "${RADIO_E2E_PREVIEW_URL:-}" ]]; then
        echo "${RADIO_E2E_PREVIEW_URL}"
      else
        echo "https://radio-preview.${CLOUDFLARE_ACCOUNT_SUBDOMAIN:-<account>}.workers.dev"
      fi
      ;;
    prod) echo "https://044g.com" ;;
    *)
      echo "unknown RADIO_E2E_TIER: ${RADIO_E2E_TIER}" >&2
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
  local tier="${RADIO_E2E_TIER:-local}"
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
    preview)
      if [[ "$base" != *".workers.dev"* ]]; then
        echo "preview tier expects *.workers.dev base URL (got $base)" >&2
        exit 2
      fi
      ;;
    local)
      if [[ "$base" != http://127.0.0.1:* && "$base" != http://localhost:* ]]; then
        echo "local tier expects loopback base URL (got $base)" >&2
        exit 2
      fi
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
    echo "missing required command: $cmd" >&2
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
  case "${RADIO_E2E_TIER:-local}" in
    local) radio_e2e_assert_local_fixture_html "$html" ;;
    # workers.dev / production build: SSR is an Inertia JSON shell; DOM markers need opencli.
    preview) radio_e2e_assert_inertia_shell_html "$html" ;;
    prod) radio_e2e_assert_inertia_shell_html "$html" ;;
    *)
      echo "unknown RADIO_E2E_TIER=${RADIO_E2E_TIER}" >&2
      exit 2
      ;;
  esac
}

radio_e2e_asserts_fixture_values() {
  [[ "${RADIO_E2E_TIER:-local}" == "local" ]]
}
