#!/bin/sh
# Minimal HTTP server reporting established TCP clients on the MPD httpd port.
# MPD status does not expose httpd listener counts; mpc-bridge injects this value.

PORT="${STREAM_STATS_PORT:-8001}"
HTTPD_PORT="${MPD_HTTP_PORT:-8000}"

count_stream_clients() {
	ss -Htan state established "( sport = :${HTTPD_PORT} )" 2>/dev/null | wc -l | tr -d ' '
}

while true; do
	count="$(count_stream_clients)"
	body="${count:-0}"
	len="${#body}"
	{
		printf 'HTTP/1.1 200 OK\r\n'
		printf 'Content-Type: text/plain\r\n'
		printf 'Content-Length: %s\r\n' "$len"
		printf 'Connection: close\r\n'
		printf '\r\n'
		printf '%s' "$body"
	} | nc -l -p "$PORT" -q 1 2>/dev/null || sleep 0.2
done
