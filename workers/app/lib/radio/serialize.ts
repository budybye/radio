import { Result, ResultDeserializationError, type SerializedResult } from "better-result";

import { MpdTransportError, type MpdError } from "./errors";
import type { CurrentSongView } from "./types";

export type CurrentSongClient = Exclude<
  CurrentSongView,
  null | { unchanged: true }
>;

/** DO/RPC 越し `SerializedResult` を MpdError に正規化して復元 */
export function deserializeCurrentSongView(
  serialized: SerializedResult<CurrentSongView, MpdError>,
): Result<CurrentSongView, MpdError> {
  return Result.deserialize<CurrentSongView, MpdError>(serialized).mapError(
    (e) =>
      ResultDeserializationError.is(e)
        ? new MpdTransportError({ message: e.message, cause: e })
        : e,
  );
}

/** `SerializedResult` → 表示用（unchanged / err は cache を維持） */
export function currentSongFromSerialized(
  serialized: SerializedResult<CurrentSongView, MpdError>,
  cache: CurrentSongClient | null,
): CurrentSongClient | null {
  const result = deserializeCurrentSongView(serialized);
  if (result.isErr()) return cache;
  const data = result.value;
  if (data === null) return null;
  if ("unchanged" in data) return cache;
  return data;
}
