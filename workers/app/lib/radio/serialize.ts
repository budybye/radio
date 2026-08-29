import { Result, type SerializedResult } from "better-result";

import {
  MpcHttpError,
  MpdAckError,
  MpdInvalidArgumentError,
  MpdInvalidResponseError,
  MpdTransportError,
  mpdErrorFromUnknown,
  type MpdError,
} from "./errors";
import type { CurrentSongView } from "./types";
import { type MpdErrorWire } from "./serialize-wire";

export type { MpdErrorWire, RpcSerializedEnvelopeWire } from "./serialize-wire";
export { parseSerializedCurrentSongView, parseSerializedCurrentSongFromAgentCall } from "./serialize-wire";

export type CurrentSongClient = Exclude<
  CurrentSongView,
  null | { unchanged: true }
>;

/** TaggedError → DO/RPC wire 形（structuredClone 前に平オブジェクト化） */
export function mpdErrorToWire(error: MpdError): MpdErrorWire {
  // SAFETY: TaggedError.toJSON() returns the wire fields consumed by hydrateMpdError.
  return error.toJSON() as MpdErrorWire;
}

/** UI / ログ向けに wire から表示メッセージを取り出す */
export function mpdWireMessage(
  wire: MpdErrorWire | null | undefined,
): string | null {
  if (!wire) return null;
  return wire.message ?? wire._tag;
}

/** tick 更新判定用（message + tag で比較） */
export function mpdWireEqual(
  a: MpdErrorWire | null | undefined,
  b: MpdErrorWire | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a._tag === b._tag && (a.message ?? "") === (b.message ?? "");
}

export type SerializedMpdResult<T> = SerializedResult<T, MpdErrorWire>;

/** MPD Result を RPC 用 envelope へ。error スロットは hydrateMpdError が復元する wire 形 */
export function serializeMpdResult<T>(
  result: Result<T, MpdError>,
): SerializedMpdResult<T> {
  if (result.isOk()) return { status: "ok", value: result.value };
  return {
    status: "error",
    error: mpdErrorToWire(result.error),
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
    case "MpdInvalidArgumentError":
      return new MpdInvalidArgumentError({
        field: String(wire.field ?? "argument"),
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
