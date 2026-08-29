#!/usr/bin/env bash
# Deploy Worker "radio" → radio.*.workers.dev (+ optional custom domain via workers/.env).
# Always: vpr build, then deploy dist/radio/wrangler.json (built bundle + client assets).
# wrangler.jsonc is the source config only — deploying it ships dev asset paths.
#
# Maintainer: workers/.env with MPD_HOST / MPC_HOST (+ optional WORKER_CUSTOM_DOMAIN).
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
  WRANGLER_ARGS+=(--var "MPD_HOST:${MPD_HOST}" --var "MPC_HOST:${MPC_HOST}")
  echo "==> wrangler deploy (Worker: radio, vars from workers/.env)"
  echo "    MPD_HOST=$MPD_HOST"
  echo "    MPC_HOST=$MPC_HOST"
else
  echo "==> wrangler deploy (Worker: radio, placeholder vars)"
  echo "    Tip: create workers/.env for maintainer hostnames"
fi

if [[ -n "${WORKER_CUSTOM_DOMAIN:-}" ]]; then
  WRANGLER_ARGS+=(--domain "$WORKER_CUSTOM_DOMAIN")
  echo "    WORKER_CUSTOM_DOMAIN=$WORKER_CUSTOM_DOMAIN"
fi

exec wrangler "${WRANGLER_ARGS[@]}"
