import { Result } from "better-result";

import type { MpdError } from "../../lib/radio/errors";
import type { CurrentSongView } from "../../lib/radio/types";

export function watchTick(
  result: Result<CurrentSongView, MpdError>,
  songid: string | undefined,
): { push: boolean; songid: string | undefined } {
  if (result.isErr()) return { push: true, songid };
  const data = result.value;
  if (data === null) return { push: true, songid: undefined };
  if ("unchanged" in data) return { push: false, songid: data.songid };
  return { push: true, songid: data.songid };
}
