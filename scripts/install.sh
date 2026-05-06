#!/bin/bash
set -euo pipefail

MUSIC_DIR="${1:-$HOME/Music}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ARCH=$(dpkg --print-architecture)

die() { echo "[ERROR] $*" >&2; exit 1; }

# ──────────────────────────────
echo "=== MPD Local Install for Ubuntu/Debian ($ARCH) ==="

sudo apt-get update || die "apt-get update failed"
sudo apt-get install -y mpd mpc ncmpcpp curl ufw lsb-release || die "apt install failed"

# ── Check port conflicts ──
for port in 6600 8000; do
    if ss -tlnp 2>/dev/null | grep -q ":$port "; then
        die "Port $port is already in use. Stop the existing MPD first."
    fi
done

# ── Backup ──
if [ -f /etc/mpd.conf ]; then
    sudo cp /etc/mpd.conf "/etc/mpd.conf.bak.$(date +%s)"
fi

# ── Config: localhost only + correct music dir ──
sed \
  -e "s|music_directory.*|music_directory \"$MUSIC_DIR\"|g" \
  -e '0,/bind_to_address/s/bind_to_address.*/bind_to_address         "127.0.0.1"/' \
  -e '0,/bind_to_address/s/bind_to_address.*/bind_to_address         "127.0.0.1"/' \
  "$SCRIPT_DIR/../config/mpd.conf" | sudo tee /etc/mpd.conf > /dev/null

mkdir -p "$MUSIC_DIR"
sudo mkdir -p /var/lib/mpd/playlists
sudo chown -R mpd:audio /var/lib/mpd
sudo chmod 755 /var/lib/mpd

# ncmpcpp config XDG_CONFIG_HOME support
mkdir -p ~/.config/ncmpcpp
cp "$SCRIPT_DIR/../config/config" ~/.config/ncmpcpp/config

# ── Start MPD ──
sudo systemctl enable mpd || die "systemctl enable mpd failed"
sudo systemctl restart mpd || die "systemctl restart mpd failed"

# Wait for MPD socket
echo -n "Waiting for MPD..."
for i in {1..30}; do
    if mpc status >/dev/null 2>&1; then break; fi
    echo -n "."
    sleep 1
done
echo ""
mpc status >/dev/null 2>&1 || die "MPD failed to start"

# ── Auto-queue ──
if ! mpc status | grep -q "\[playing\]"; then
    echo "Updating library and queuing tracks..."
    mpc update --wait || true
    mpc ls 2>/dev/null | head -500 | mpc add || true
    mpc play 2>/dev/null || true
fi

# ── UFW ──
if sudo ufw status 2>/dev/null | grep -q "Status: active"; then
    echo ""
    echo "=== Configuring UFW (localhost only) ==="
    sudo ufw allow from 127.0.0.1 to any port 6600 proto tcp comment 'MPD control' || true
    sudo ufw allow from 127.0.0.1 to any port 8000 proto tcp comment 'MPD stream' || true
    echo "Done"
fi

# ── cloudflared via official APT repo ──
echo ""
if command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared already installed: $(cloudflared --version 2>/dev/null | head -1)"
else
    echo "=== Adding Cloudflare APT repository ==="
    CODENAME=$(lsb_release -cs)
    sudo mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $CODENAME main" \
        | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
    sudo apt-get update || die "apt-get update (cloudflared repo) failed"
    sudo apt-get install -y cloudflared || die "apt install cloudflared failed"
fi

# ── Tunnel service ──
echo ""
TUNNEL_TOKEN=""
if [ -f "$SCRIPT_DIR/../.env" ]; then
    TUNNEL_TOKEN=$(grep "^TUNNEL_TOKEN=" "$SCRIPT_DIR/../.env" | cut -d'=' -f2- || true)
fi

if [ -z "$TUNNEL_TOKEN" ] && [ -t 0 ]; then
    echo "Enter your TUNNEL_TOKEN (leave empty to skip):"
    read -r TUNNEL_TOKEN || true
fi

if [ -n "$TUNNEL_TOKEN" ]; then
    sudo mkdir -p /etc/cloudflared
    printf 'TUNNEL_TOKEN=%s\n' "$TUNNEL_TOKEN" | sudo tee /etc/cloudflared/tunnel.env > /dev/null
    sudo chmod 600 /etc/cloudflared/tunnel.env

    sudo tee /etc/systemd/system/cloudflared-tunnel.service > /dev/null <<'UNIT'
[Unit]
Description=Cloudflare Tunnel for MPD Radio
After=network-online.target mpd.service
Requires=mpd.service
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/cloudflared/tunnel.env
ExecStart=/usr/bin/cloudflared tunnel run --token ${TUNNEL_TOKEN}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

    sudo systemctl daemon-reload
    sudo systemctl enable --now cloudflared-tunnel || die "Failed to start cloudflared-tunnel"
    echo "cloudflared-tunnel enabled and started"
fi

# ── Summary ──
echo ""
echo "=== Done ==="
echo "Music directory: $MUSIC_DIR"
echo ""
echo "Services:"
systemctl --no-pager status mpd | grep -E "Active:|Loaded:" || true
[ -n "${TUNNEL_TOKEN:-}" ] && systemctl --no-pager status cloudflared-tunnel | grep -E "Active:|Loaded:" || true
echo ""
mpc status 2>/dev/null || true
echo ""
echo "Commands:"
echo "  mpc status              - Check MPD"
echo "  ncmpcpp                 - TUI client"
echo "  sudo systemctl status mpd"
echo "  sudo systemctl status cloudflared-tunnel"
echo ""
echo "Stream URL: http://127.0.0.1:8000"
