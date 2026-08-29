#!/usr/bin/env bash
# Deploy Worker "radio" → radio.*.workers.dev (+ optional custom domain in dashboard).
# Always: vpr build + --config wrangler.jsonc (never trust dist/radio/wrangler.json alone).
#
# Maintainer: copy .env.production.example → .env.production (MPD_HOST / MPC_HOST).
# Fork: omit .env.production — placeholder vars from wrangler.jsonc are used.
set -euo pipefail

WORKERS="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$WORKERS/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"

cd "$WORKERS"
echo "==> vpr build"
vpr build

WRANGLER_ARGS=(deploy --config wrangler.jsonc)

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  : "${MPD_HOST:?MPD_HOST required in .env.production}"
  : "${MPC_HOST:?MPC_HOST required in .env.production}"
  echo "==> wrangler deploy (Worker: radio, vars from .env.production)"
  echo "    MPD_HOST=$MPD_HOST"
  echo "    MPC_HOST=$MPC_HOST"
  exec wrangler "${WRANGLER_ARGS[@]}" \
    --var "MPD_HOST:${MPD_HOST}" \
    --var "MPC_HOST:${MPC_HOST}"
fi

echo "==> wrangler deploy (Worker: radio, placeholder vars)"
echo "    Tip: create .env.production for maintainer hostnames"
exec wrangler "${WRANGLER_ARGS[@]}"
