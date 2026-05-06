#!/bin/sh
set -e

# Ensure MPD data directory ownership
chown -R mpd:audio /var/lib/mpd

# Background: auto-queue and auto-play when MPD is ready
(
    set -x
    until mpc status >/dev/null 2>&1; do
        sleep 0.5
    done
    if [ "$(mpc playlist | wc -l)" -eq 0 ]; then
        mpc update --wait
        mpc ls | mpc add
        mpc random on && mpc play
    fi
) >/tmp/entrypoint-bg.log 2>&1 &

# Start MPD as PID 1
exec mpd --stdout --no-daemon /etc/mpd.conf
