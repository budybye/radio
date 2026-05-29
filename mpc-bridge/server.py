#!/usr/bin/env python3
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

MPD_HOST = os.environ.get("MPD_HOST", "mpd")
MPD_PORT = os.environ.get("MPD_PORT", "6600")
LISTEN_PORT = int(os.environ.get("PORT", "8080"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, _format, *_args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/mpd.cgi":
            self.send_error(404)
            return

        cmd = parse_qs(parsed.query).get("cmd", [""])[0]
        if not cmd or "\n" in cmd or "\r" in cmd:
            self._text(b"ACK [4@0] invalid command\n")
            return

        if cmd == "ping":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}\n')
            return

        proc = subprocess.run(
            ["nc", "-w", "5", MPD_HOST, MPD_PORT],
            input=f"{cmd}\n",
            capture_output=True,
            text=True,
            check=False,
        )
        raw = proc.stdout or ""
        if not raw:
            self._text(b"ACK [52@0] mpc-bridge: mpd unreachable\n")
            return

        self._text(raw.encode())

    def _text(self, body: bytes):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", LISTEN_PORT), Handler).serve_forever()
