import {
  type AnyTaggedError,
  Result,
  type SerializedResult,
} from "better-result";

import {
  MpcHttpError,
  MpdAckError,
  MpdInvalidResponseError,
  MpdTransportError,
  mpdErrorFromUnknown,
  type MpdError,
} from "./errors";
import type { CurrentSongView } from "./types";
import {
  type MpdErrorWire,
} from "./serialize-wire";

export type { MpdErrorWire, RpcSerializedEnvelopeWire } from "./serialize-wire";
export { parseSerializedCurrentSongView, parseSerializedCurrentSongFromAgentCall } from "./serialize-wire";

export type CurrentSongClient = Exclude<
  CurrentSongView,
  null | { unchanged: true }
>;

/** TaggedError は toJSON を持つ。RPC は structuredClone が toJSON を踏まないので先に平オブジェクト化する */
export function serializeResult<T, E extends AnyTaggedError>(
  result: Result<T, E>,
): SerializedResult<T, E> {
  if (result.isOk()) return { status: "ok", value: result.value };
  // SAFETY: SerializedErr<E> の error スロットは wire 上では toJSON() の平オブジェクト。
  // 「E」という型は deserialize 側 hydrateMpdError が _tag でコンストラクタ再構築した後に成立する契約を表す
  return { status: "error", error: result.error.toJSON() as E };
}

export type SerializedMpdResult<T> = SerializedResult<T, MpdErrorWire>;

/** MPD Result を RPC 用 envelope へ。error スロットは hydrateMpdError が復元する wire 形 */
export function serializeMpdResult<T>(
  result: Result<T, MpdError>,
): SerializedMpdResult<T> {
  if (result.isOk()) return { status: "ok", value: result.value };
  // SAFETY: TaggedError.toJSON() は MpdErrorWire の平オブジェクトを返す。_tag はランタイムで検証済み。
  return {
    status: "error",
    error: result.error.toJSON() as MpdErrorWire,
  };
}

/** DO/RPC 越しに来た平オブジェクトを _tag で MpdError へ復元。壊れていれば TransportError へフォールバック */
export function hydrateMpdError(wire: MpdErrorWire): MpdError {
  switch (wire._tag) {
    case "MpcHttpError":
      return new MpcHttpError({
        status: Number(wire.status),
        url: String(wire.url ?? ""),
      });
    case "MpdInvalidResponseError":
      return new MpdInvalidResponseError({
        url: String(wire.url ?? ""),
        preview: String(wire.preview ?? ""),
      });
    case "MpdAckError":
      return new MpdAckError({
        cmd: String(wire.cmd ?? ""),
        preview: String(wire.preview ?? ""),
      });
    case "MpdTransportError":
      return new MpdTransportError({
        message: String(wire.message ?? "unknown"),
        cause: wire.cause,
      });
    default:
      return mpdErrorFromUnknown(wire);
  }
}

/** DO/RPC 越し `SerializedResult` を MpdError に正規化して復元 */
export function deserializeCurrentSongView(
  serialized: SerializedMpdResult<CurrentSongView>,
): Result<CurrentSongView, MpdError> {
  if (serialized.status === "ok") return Result.ok(serialized.value);
  if (serialized.status === "error") {
    return Result.err(hydrateMpdError(serialized.error));
  }
  return Result.err(
    new MpdTransportError({ message: "invalid SerializedResult envelope" }),
  );
}

/** `SerializedResult` → 表示用（unchanged / err は cache を維持） */
export function currentSongFromSerialized(
  serialized: SerializedMpdResult<CurrentSongView>,
  cache: CurrentSongClient | null,
): CurrentSongClient | null {
  return deserializeCurrentSongView(serialized).match({
    ok: (data) => {
      if (data === null) return null;
      if ("unchanged" in data) return cache;
      return data;
    },
    err: () => cache,
  });
}
