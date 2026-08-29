#!/usr/bin/env bash
# Contract tests only — no localhost dev server required.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "== E2E: unit + mpd-stub contract (no vp dev / localhost) =="
echo "   For deployed smoke: make test-e2e-workers (radio.*.workers.dev)"
echo ""

echo "== Workers unit tests =="
(cd "$ROOT/workers" && bun run test)

echo "== mpd-stub contract =="
bash "$ROOT/scripts/e2e/mpd-stub-contract.sh"

echo "PASS: stub contract tier"
