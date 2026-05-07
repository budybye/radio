import { Hono } from "hono";
import { connect } from "cloudflare:sockets";

export function mpdCommand(cmd: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const socket = connect({ hostname: "mpd", port: 6600 });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    let data = "";

    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(`${cmd}\nclose\n`));
      writer.releaseLock();

      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        data += decoder.decode(value, { stream: true });
        if (data.includes("OK\n") || data.includes("ACK ")) break;
      }

      resolve(data);
    } catch (e) {
      reject(e);
    } finally {
      socket.close();
    }
  });
}

function parseMpdResponse(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (line.startsWith("OK") || line.startsWith("ACK")) continue;
    const idx = line.indexOf(": ");
    if (idx > 0) result[line.slice(0, idx)] = line.slice(idx + 2);
  }
  return result;
}

async function getStatus() {
  const raw = await mpdCommand("status");
  return parseMpdResponse(raw);
}

async function getCurrentSong() {
  const raw = await mpdCommand("currentsong");
  return parseMpdResponse(raw);
}

// async function play() {
//   await mpdCommand("play");
// }

// async function pause() {
//   await mpdCommand("pause 1");
// }

// async function next() {
//   await mpdCommand("next");
// }

// async function previous() {
//   await mpdCommand("previous");
// }

export const mpd = new Hono<Env>()
  .get("/status", async (c) => c.json(await getStatus()))
  .get("/currentsong", async (c) => c.json(await getCurrentSong()));
// .post("/play", async (c) => { await play(); return c.json({ ok: true }); })
// .post("/pause", async (c) => { await pause(); return c.json({ ok: true }); })
// .post("/next", async (c) => { await next(); return c.json({ ok: true }); })
// .post("/prev", async (c) => { await previous(); return c.json({ ok: true }); });
