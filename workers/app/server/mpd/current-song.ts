import { Result } from "better-result";
import { env } from "cloudflare:workers";
import {
  MpdTransportError,
  mpdErrorFromUnknown,
  type MpdError,
} from "../../lib/radio/errors";

import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../../lib/radio/types";
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import {
  deserializeCurrentSongView,
  parseSerializedCurrentSongFromAgentCall,
  type RpcSerializedEnvelopeWire,
} from "../../lib/radio/serialize";
import { mpdAgentStub } from "../../../worker/mpd-agent";

let ssrSongCache: {
  expires: number;
  song: CurrentSongPayload | undefined;
} | null = null;

export async function getCurrentSongResult(
  clientSongid?: string,
): Promise<Result<CurrentSongView, MpdError>> {
  const fetched = await Result.tryPromise({
    try: async () => {
      const stub = await mpdAgentStub(env);
      return await stub.getCurrentSongView(clientSongid);
    },
    catch: mpdErrorFromUnknown,
  });
  return fetched.andThen((wire) => {
    // SAFETY: DO RPC returns structured-clone JSON; invalid shapes fail envelope parse.
    const serialized = parseSerializedCurrentSongFromAgentCall(
      wire as RpcSerializedEnvelopeWire | null,
    );
    if (!serialized) {
      return Result.err(
        new MpdTransportError({ message: "invalid SerializedResult envelope" }),
      );
    }
    return deserializeCurrentSongView(serialized);
  });
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
