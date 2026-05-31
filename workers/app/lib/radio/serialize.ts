import { Result, type SerializedResult } from "better-result";

import type { MpdError } from "./errors";
import type { CurrentSongView } from "./types";

export type CurrentSongClient = Exclude<
  CurrentSongView,
  null | { unchanged: true }
>;

/** `SerializedResult` → 表示用（unchanged / err は cache を維持） */
export function currentSongFromSerialized(
  serialized: SerializedResult<CurrentSongView, MpdError>,
  cache: CurrentSongClient | null,
): CurrentSongClient | null {
  const result = Result.deserialize<CurrentSongView, MpdError>(serialized);
  if (result.isErr()) return cache;
  const data = result.value;
  if (data === null) return null;
  if ("unchanged" in data) return cache;
  return data;
}
