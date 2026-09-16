import * as v from "valibot";

import { mpdStatusSchema } from "../../server/mpd/parse";
import { serializedEnvelopeSchema } from "../../lib/radio/serialize-wire";

/** GET /status 応答（parseMpdStatus の wire 形） */
export const mpdStatusResponseSchema = v.pipe(
  v.object({
    status: mpdStatusSchema,
    listenerCount: v.number(),
    fieldCount: v.number(),
  }),
  v.description("Parsed MPD status command"),
  v.metadata({ ref: "MpdStatusResponse" }),
);

/** DO RPC / GET /currentsong の SerializedMpdResult wire 形 */
export const serializedMpdResultSchema = v.pipe(
  serializedEnvelopeSchema,
  v.description("better-result wire envelope for MPD RPC/JSON"),
  v.metadata({ ref: "SerializedMpdResult" }),
);

export const currentSongQuerySchema = v.pipe(
  v.object({
    songid: v.optional(v.string()),
  }),
  v.examples([{ songid: "42" }, {}]),
);

export const mpdPingOkSchema = v.pipe(
  v.object({
    ok: v.literal(true),
    target: v.string(),
    via: v.string(),
    state: v.nullable(v.string()),
    fields: v.number(),
  }),
  v.metadata({ ref: "MpdPingOk" }),
);

export const mpdPingErrSchema = v.pipe(
  v.object({
    ok: v.literal(false),
    target: v.string(),
    error: v.string(),
    hint: v.string(),
  }),
  v.metadata({ ref: "MpdPingErr" }),
);

export const mpdPingResponseSchema = v.variant("ok", [mpdPingOkSchema, mpdPingErrSchema]);
