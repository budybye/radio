#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export RADIO_E2E_TIER=prod
export RADIO_E2E_ALLOW_PROD=1
export RADIO_E2E_BASE_URL="${RADIO_E2E_BASE_URL:-https://044g.com}"

bash "$ROOT/scripts/e2e/http-smoke.sh"
