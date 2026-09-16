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
import { createMpdPingError, mpcBridgePing, resolveMpcBaseUrl } from "./ping";
import { queryCurrentSongFromBridge } from "./current-song";
import { mpdCommand } from "./bridge";
import { parseMpdStatus } from "./parse";

async function getParsedStatusResult() {
  return (await mpdCommand("status")).map(parseMpdStatus);
}

export const mpd = new Hono<Env>()
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
      const statusResult = await getParsedStatusResult();

      if (statusResult.isErr()) return respondMpdJsonError(c, statusResult.error);
      const statusPayload = statusResult.value;

      return c.json(statusPayload);
    },
  )
  .get(
    "/currentsong",
    describeRoute({
      tags: ["mpd"],
      summary: "Current song (mpc-bridge)",
      description:
        "Returns `SerializedMpdResult<CurrentSongView>` from mpc-bridge. Pass `songid` to receive `{ unchanged: true }` when unchanged.",
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
      const { songid: songId } = c.req.valid("query");
      const currentSongResult = await queryCurrentSongFromBridge(songId);

      return c.json(serializeMpdResult(currentSongResult));
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
      const bridgeUrl = resolveMpcBaseUrl();
      const bridgePingResult = await mpcBridgePing();

      if (bridgePingResult.isErr()) {
        return c.json(bridgePingResult.error, 502);
      }

      const statusResult = await getParsedStatusResult();

      if (statusResult.isErr()) {
        return c.json(createMpdPingError(bridgeUrl, statusResult.error.message), 502);
      }

      const statusPayload = statusResult.value;

      const pingResponse: MpdPingOk = {
        ok: true,
        target: bridgeUrl,
        via: "fetch (tunnel HTTP)",
        state: statusPayload.status.state ?? null,
        fields: statusPayload.fieldCount,
      };

      return c.json(pingResponse satisfies MpdPingResponse);
    },
  );
