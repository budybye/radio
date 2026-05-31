import { Hono } from "hono";
import { Result } from "better-result";

import {
  mpcBaseUrl,
  mpcBridgePing,
  mpdPingErr,
  type MpdPingOk,
  type MpdPingErr,
} from "./transport";
import { getCurrentSongResult, getStatusResult } from "./current-song";

type MpdPingResponse = MpdPingOk | MpdPingErr;

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
      return c.json(ping.error satisfies MpdPingErr, 502);
    }

    const result = await getStatusResult();
    if (result.isErr()) {
      return c.json(mpdPingErr(target, result.error.message), 502);
    }

    const parsed = result.value;
    const body: MpdPingOk = {
      ok: true,
      target,
      via: "fetch (tunnel HTTP)",
      state: parsed.state ?? null,
      fields: Object.keys(parsed).length,
    };
    return c.json(body satisfies MpdPingResponse);
  });
