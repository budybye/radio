#!/usr/bin/env bash
set -euo pipefail

env_file="${ENV_FILE:-.env}"
if [[ ! -f "$env_file" ]]; then
  echo "Secret env file not found: $env_file" >&2
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

awk -F= '
  $1 ~ /^(CF_ACCESS_CLIENT_ID|CF_ACCESS_CLIENT_SECRET|USERNAME|PASSWORD|TOKEN)$/ { print }
' "$env_file" >"$tmp_file"

wrangler secret bulk "$tmp_file"
