#!/usr/bin/env bash
# Deploy radio Workers — always runs vpr build first, always passes --config wrangler.jsonc.
#
# Usage:
#   ./scripts/deploy.sh fork        # fork / Deploy button equivalent
#   ./scripts/deploy.sh preview     # radio-preview.*.workers.dev (E2E)
#   ./scripts/deploy.sh production  # radio + custom domain (needs .env.production)
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  cat >&2 <<'EOF'
Usage: deploy.sh <fork|preview|production>

  fork        Deploy default env → radio.*.workers.dev (placeholder vars)
  preview     Deploy preview env → radio-preview.*.workers.dev (E2E only)
  production  Deploy production env → Worker "radio" + custom domain
              Requires root .env.production (MPD_HOST, MPC_HOST)
EOF
  exit 1
fi

WORKERS="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$WORKERS/.." && pwd)"

cd "$WORKERS"
echo "==> vpr build"
vpr build

case "$TARGET" in
  fork)
    echo "==> wrangler deploy (default env, Worker: radio)"
    exec wrangler deploy --config wrangler.jsonc
    ;;
  preview)
    echo "==> wrangler deploy --env preview (Worker: radio-preview)"
    exec wrangler deploy --env preview --config wrangler.jsonc
    ;;
  production)
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

    echo "==> wrangler deploy --env production (Worker: radio, workers_dev: false)"
    echo "    MPD_HOST=$MPD_HOST"
    echo "    MPC_HOST=$MPC_HOST"
    echo "    (custom domain must be bound to Worker \"radio\" in dashboard)"
    exec wrangler deploy --env production --config wrangler.jsonc \
      --var "MPD_HOST:${MPD_HOST}" \
      --var "MPC_HOST:${MPC_HOST}"
    ;;
  *)
    echo "Unknown target: $TARGET (use fork | preview | production)" >&2
    exit 1
    ;;
esac
