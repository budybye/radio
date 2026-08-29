#!/usr/bin/env bash
# Deploy Worker "radio" → radio.*.workers.dev (+ optional custom domain in dashboard).
# Always: vpr build, then deploy dist/radio/wrangler.json (built bundle + client assets).
# wrangler.jsonc is the source config only — deploying it ships dev asset paths.
#
# Maintainer: workers/.env with MPD_HOST / MPC_HOST.
# Fork: omit workers/.env — placeholder vars from wrangler.jsonc are used.
set -euo pipefail

WORKERS="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$WORKERS/.env}"

cd "$WORKERS"
echo "==> vpr build"
vpr build

WRANGLER_ARGS=(deploy --config dist/radio/wrangler.json)

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  : "${MPD_HOST:?MPD_HOST required in workers/.env}"
  : "${MPC_HOST:?MPC_HOST required in workers/.env}"
  echo "==> wrangler deploy (Worker: radio, vars from workers/.env)"
  echo "    MPD_HOST=$MPD_HOST"
  echo "    MPC_HOST=$MPC_HOST"
  exec wrangler "${WRANGLER_ARGS[@]}" \
    --var "MPD_HOST:${MPD_HOST}" \
    --var "MPC_HOST:${MPC_HOST}"
fi

echo "==> wrangler deploy (Worker: radio, placeholder vars)"
echo "    Tip: create workers/.env for maintainer hostnames"
exec wrangler "${WRANGLER_ARGS[@]}"
