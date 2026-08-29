#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures", "mpd");
const PORT = Number(process.env.MPD_STUB_PORT ?? "18080");
const HOST = process.env.MPD_STUB_HOST ?? "127.0.0.1";

const fixtures = {
  status: "status.txt",
  currentsong: "currentsong.txt",
};

async function loadFixture(name) {
  const file = fixtures[name];
  if (!file) return null;
  return readFile(join(FIXTURES, file), "utf8");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  if (url.pathname !== "/mpd.cgi") {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found\n");
    return;
  }

  const cmd = url.searchParams.get("cmd") ?? "";
  if (cmd === "ping") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const body = await loadFixture(cmd);
  if (!body) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ACK [4@0] invalid command\n");
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end(body);
});

server.listen(PORT, HOST, () => {
  console.log(`mpd-stub listening on http://${HOST}:${PORT}`);
});
