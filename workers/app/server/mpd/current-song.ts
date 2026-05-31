import { Result, type SerializedResult } from "better-result";
import { env } from "cloudflare:workers";

import type { MpdError } from "../../lib/radio/errors";
import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../../lib/radio/types";
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import { deserializeCurrentSongView } from "../../lib/radio/serialize";
import { mpdAgentStub } from "../../../worker/mpd-agent";
let ssrSongCache: {
  expires: number;
  song: CurrentSongPayload | undefined;
} | null = null;

export async function getCurrentSongResult(
  clientSongid?: string,
): Promise<Result<CurrentSongView, MpdError>> {
  const stub = await mpdAgentStub(env);
  const serialized = (await stub.getCurrentSongView(
    clientSongid,
  )) as SerializedResult<CurrentSongView, MpdError>;
  return deserializeCurrentSongView(serialized);
}

/** Inertia SSR 用（失敗時は undefined）。短 TTL キャッシュで MPD 連打を抑える。 */
export async function fetchCurrentSong(): Promise<
  CurrentSongPayload | undefined
> {
  const now = Date.now();
  if (ssrSongCache && ssrSongCache.expires > now) {
    return ssrSongCache.song;
  }

  const song = (await getCurrentSongResult()).match({
    ok: (data) =>
      data === null || "unchanged" in data ? undefined : data,
    err: () => undefined,
  });

  ssrSongCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    song,
  };
  return song;
}
