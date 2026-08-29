import { describeRoute, resolver, validator } from "hono-openapi";
import { Hono } from "hono";

import { respondMpdJsonError } from "../../lib/radio/mpd-http";
import { serializeMpdResult } from "../../lib/radio/serialize";
import {
  currentSongQuerySchema,
  mpdPingResponseSchema,
  mpdStatusResponseSchema,
  serializedMpdResultSchema,
} from "../../schemas/openapi/mpd";
import { basic } from "../middleware";
import { mpdJsonErrorResponses } from "../openapi/responses";
import type { MpdPingOk, MpdPingResponse } from "../../schemas/mpd";
import { mpcBaseUrl, mpcBridgePing, mpdPingErr } from "./ping";
import { getCurrentSongResult } from "./current-song";
import { mpdCommand } from "./bridge";
import { parseMpdStatus } from "./parse";

async function getStatusResult() {
  return (await mpdCommand("status")).map(parseMpdStatus);
}

export function createMpdRoutes() {
  return new Hono<Env>()
  .get(
    "/status",
    describeRoute({
      tags: ["mpd"],
      summary: "MPD status",
      description: "Raw MPD `status` parsed via mpc-bridge",
      security: [{ basicAuth: [] }],
      responses: {
        200: {
          description: "MPD status",
          content: {
            "application/json": { schema: resolver(mpdStatusResponseSchema) },
          },
        },
        ...mpdJsonErrorResponses,
      },
    }),
    basic,
    async (c) => {
      const result = await getStatusResult();
      if (result.isErr()) return respondMpdJsonError(c, result.error);
      return c.json(result.value);
    },
  )
  .get(
    "/currentsong",
    describeRoute({
      tags: ["mpd"],
      summary: "Current song (MpdAgent-backed)",
      description:
        "Returns `SerializedMpdResult<CurrentSongView>`. Pass `songid` to receive `{ unchanged: true }` when unchanged.",
      security: [{ basicAuth: [] }],
      parameters: [
        {
          name: "songid",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Current song wire envelope",
          content: {
            "application/json": {
              schema: resolver(serializedMpdResultSchema),
            },
          },
        },
        ...mpdJsonErrorResponses,
      },
    }),
    validator("query", currentSongQuerySchema),
    basic,
    async (c) => {
      const { songid } = c.req.valid("query");
      const result = await getCurrentSongResult(songid);
      return c.json(serializeMpdResult(result));
    },
  )
  .get(
    "/mpd/ping",
    describeRoute({
      tags: ["mpd"],
      summary: "mpc-bridge + MPD reachability",
      security: [{ basicAuth: [] }],
      responses: {
        200: {
          description: "Ping OK",
          content: {
            "application/json": { schema: resolver(mpdPingResponseSchema) },
          },
        },
        502: {
          description: "Bridge or MPD unreachable",
          content: {
            "application/json": { schema: resolver(mpdPingResponseSchema) },
          },
        },
      },
    }),
    basic,
    async (c) => {
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
        state: parsed.status.state ?? null,
        fields: parsed.fieldCount,
      };
      return c.json(body satisfies MpdPingResponse);
    },
  );
}

export const mpd = createMpdRoutes();
