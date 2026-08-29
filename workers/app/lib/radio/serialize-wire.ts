import * as v from "valibot";

/** DO/RPC 越し MpdError の wire 形（hydrateMpdError が _tag で復元） */
export type MpdErrorWire = {
  readonly _tag: string;
  status?: number;
  url?: string;
  preview?: string;
  cmd?: string;
  message?: string;
  cause?: string | null;
};

const currentSongPayloadSchema = v.object({
  title: v.string(),
  artist: v.string(),
  album: v.string(),
  file: v.string(),
  songid: v.string(),
});

const currentSongViewSchema = v.union([
  v.object({
    unchanged: v.literal(true),
    songid: v.string(),
  }),
  currentSongPayloadSchema,
  v.null(),
]);

const mpdErrorWireSchema = v.object({
  _tag: v.string(),
  status: v.optional(v.number()),
  url: v.optional(v.string()),
  preview: v.optional(v.string()),
  cmd: v.optional(v.string()),
  message: v.optional(v.string()),
  cause: v.optional(v.nullable(v.string())),
});

const serializedOkSchema = v.object({
  status: v.literal("ok"),
  value: currentSongViewSchema,
});

const serializedErrSchema = v.object({
  status: v.literal("error"),
  error: mpdErrorWireSchema,
});

const serializedEnvelopeSchema = v.union([
  serializedOkSchema,
  serializedErrSchema,
]);

export type SerializedCurrentSongEnvelope = v.InferOutput<
  typeof serializedEnvelopeSchema
>;

/** Agents RPC structured-clone envelope（valibot parse 前） */
export type RpcSerializedEnvelopeWire = v.InferInput<
  typeof serializedEnvelopeSchema
>;

export { serializedEnvelopeSchema };

/** DO/RPC 越しの payload を SerializedResult に絞る。壊れていれば null */
export function parseSerializedCurrentSongView(
  wire: RpcSerializedEnvelopeWire | null,
): SerializedCurrentSongEnvelope | null {
  const parsed = v.safeParse(serializedEnvelopeSchema, wire);
  return parsed.success ? parsed.output : null;
}

/** Agents `call` 直後: structured-clone 値を envelope parse 入力へ正規化 */
export function parseSerializedCurrentSongFromAgentCall(
  value: RpcSerializedEnvelopeWire | null | undefined,
): SerializedCurrentSongEnvelope | null {
  return parseSerializedCurrentSongView(value ?? null);
}
