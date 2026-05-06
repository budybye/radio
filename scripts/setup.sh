#!/usr/bin/env bash
set -eu

sudo=""
if [ "$(id -u)" -ne 0 ]; then
    sudo="sudo"
fi

# ── Docker ──
if command -v docker >/dev/null 2>&1; then
    echo "docker already installed."
else
    echo "Installing Docker..."
    $sudo apt-get update
    $sudo apt-get install -y ca-certificates curl gnupg lsb-release
    $sudo install -m 0755 -d /etc/apt/keyrings
    $sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    $sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
    $sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    $sudo apt-get update

    $sudo apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin || \
        echo "docker install failed."

    $sudo groupadd -f docker
    $sudo usermod -aG docker "$(whoami)"
    $sudo systemctl enable docker

    $sudo chmod 660 /var/run/docker.sock
fi

if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose already exists."
else
    $sudo ln -sf "$(which docker)" /usr/local/bin/docker-compose
fi

docker --version || echo "docker not found"
docker compose version || echo "docker compose not found"

echo ""
echo "Done. Added $(whoami) to docker group."
echo "Re-login or run 'newgrp docker' to apply group membership."
echo "Then: make setup && make up"
