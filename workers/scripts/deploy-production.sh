#!/usr/bin/env bash
set -euo pipefail

WORKERS="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$WORKERS/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.production.example to .env.production" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${MPD_HOST:?MPD_HOST required in .env.production}"
: "${MPC_HOST:?MPC_HOST required in .env.production}"

cd "$WORKERS"
exec wrangler deploy --env production --config wrangler.jsonc \
  --var "MPD_HOST:${MPD_HOST}" \
  --var "MPC_HOST:${MPC_HOST}"
