#!/usr/bin/env bash
set -euo pipefail

radio_e2e_load_root_env() {
  local root="${1:-}"
  if [[ -n "$root" && -f "$root/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$root/.env"
    set +a
  fi
}

# Tier: workers | prod
# - workers: radio.*.workers.dev (after bun run deploy)
# - prod:    custom domain — read-only smoke (RADIO_E2E_PROD_URL)

radio_e2e_guard_tier() {
  local tier="${RADIO_E2E_TIER:-workers}"
  local base="${RADIO_E2E_BASE_URL:-}"
  if [[ -z "$base" ]]; then
    echo "Set RADIO_E2E_BASE_URL before running E2E" >&2
    exit 2
  fi
  base="${base%/}"

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
    workers)
      if [[ "$base" != *".workers.dev"* ]]; then
        echo "workers tier expects *.workers.dev base URL (got $base)" >&2
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
    echo "Required command not found: $cmd" >&2
    exit 1
  fi
}

radio_e2e_log() {
  printf '[e2e] %s\n' "$*"
}
