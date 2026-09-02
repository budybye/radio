#!/usr/bin/env bash
# mpd-stub fixture contract helpers (workers/test/fixtures/mpd/contract.json)

E2E_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

radio_e2e_contract_get() {
  local path="$1"
  node "$E2E_REPO_ROOT/workers/test/read-contract.mjs" "$path"
}
