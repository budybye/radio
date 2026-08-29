import * as v from "valibot";

import { mpdStatusSchema } from "../../server/mpd/parse";

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

export const currentSongPayloadSchema = v.pipe(
  v.object({
    title: v.string(),
    artist: v.string(),
    album: v.string(),
    file: v.string(),
    songid: v.string(),
  }),
  v.metadata({ ref: "CurrentSongPayload" }),
);

const currentSongUnchangedSchema = v.object({
  unchanged: v.literal(true),
  songid: v.string(),
});

/** GET /currentsong の value スロット */
export const currentSongViewSchema = v.union([
  currentSongUnchangedSchema,
  currentSongPayloadSchema,
  v.null(),
]);

/** DO RPC / GET /currentsong の SerializedMpdResult wire 形 */
export const serializedMpdResultSchema = v.pipe(
  v.union([
    v.object({
      status: v.literal("ok"),
      value: currentSongViewSchema,
    }),
    v.object({
      status: v.literal("error"),
      error: v.object({
        _tag: v.string(),
        message: v.optional(v.string()),
      }),
    }),
  ]),
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

export const mpdPingResponseSchema = v.variant("ok", [
  mpdPingOkSchema,
  mpdPingErrSchema,
]);
