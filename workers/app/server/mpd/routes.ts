import { Hono } from "hono";
import { Result } from "better-result";

import type { MpdPingOk, MpdPingResponse } from "../../schemas/mpd";
import { mpcBaseUrl, mpcBridgePing, mpdPingErr } from "./ping";
import { getCurrentSongResult } from "./current-song";
import { getStatusResult } from "./status";

export const mpd = new Hono<Env>()
  .get("/status", async (c) => {
    const result = await getStatusResult();
    return result.match({
      ok: (status) => c.json(status),
      err: (e) => c.json({ error: e._tag, message: e.message }, 502),
    });
  })
  .get("/currentsong", async (c) => {
    const result = await getCurrentSongResult(c.req.query("songid"));
    return c.json(Result.serialize(result));
  })
  .get("/mpd/ping", async (c) => {
    const target = mpcBaseUrl();
    const ping = await mpcBridgePing();
    if (ping.isErr()) {
      return c.json(ping.error, 502);
    }

    const status = await getStatusResult();
    if (status.isErr()) {
      return c.json(mpdPingErr(target, status.error.message), 502);
    }

    const parsed = status.value;
    const body: MpdPingOk = {
      ok: true,
      target,
      via: "fetch (tunnel HTTP)",
      state: parsed.state ?? null,
      fields: Object.keys(parsed).length,
    };
    return c.json(body satisfies MpdPingResponse);
  });
