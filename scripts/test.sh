#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

passed=0
failed=0
warned=0

check_pass() {
    echo -e "${GREEN}PASS${NC}"
    passed=$((passed + 1))
}

check_fail() {
    echo -e "${RED}FAIL${NC} - $1"
    failed=$((failed + 1))
}

check_warn() {
    echo -e "${YELLOW}WARN${NC} - $1"
    warned=$((warned + 1))
}

echo "=== Radio Test Suite ==="
echo ""

# 1. Container status
echo -n "[1/7] MPD container running... "
if docker compose ps mpd 2>/dev/null | grep -q "Up"; then
    check_pass
else
    check_fail "Run 'make up' first"
fi

# 2. MPD daemon responding
echo -n "[2/7] MPD daemon responding... "
if docker compose exec mpd mpc status >/dev/null 2>&1; then
    check_pass
else
    check_fail "MPD daemon not responding to mpc commands"
fi

# 3. Control port reachable
echo -n "[3/7] Control port (6600)... "
if docker compose exec mpd sh -c 'nc -z 127.0.0.1 6600' 2>/dev/null; then
    check_pass
else
    check_fail "MPD control port not reachable"
fi

# 4. HTTPD output enabled
echo -n "[4/7] HTTPD output (Radio Stream)... "
if docker compose exec mpd mpc outputs 2>/dev/null | grep -q "Radio Stream"; then
    check_pass
else
    check_fail "HTTPD output (Radio Stream) not enabled"
fi

# 5. Music library
echo -n "[5/7] Music library... "
count=$(docker compose exec mpd mpc ls 2>/dev/null | wc -l | tr -d ' ')
if [ "$count" -gt 0 ]; then
    check_pass
else
    check_warn "No music files in ./music/"
fi

# 6. Tunnel container
echo -n "[6/7] Tunnel container... "
if docker compose ps tunnel 2>/dev/null | grep -q "Up"; then
    check_pass
else
    check_warn "Tunnel not running (check .env TUNNEL_TOKEN)"
fi

# 7. ncmpcpp config
echo -n "[7/7] ncmpcpp config mounted... "
if docker compose exec mpd test -f /root/.ncmpcpp/config 2>/dev/null; then
    check_pass
else
    check_fail "config/config not mounted to /root/.ncmpcpp/config"
fi

echo ""
echo "=== Results: $passed passed, $failed failed, $warned warnings ==="

if [ "$failed" -gt 0 ]; then
    exit 1
fi
