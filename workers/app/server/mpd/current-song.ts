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
import { mpdCommand } from "./bridge";
import { currentSongFromMpdBridgeResponses } from "./bridge-current-song";
import { parseMpdStatus } from "./parse";

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

/** Inertia SSR 用（mpc-bridge 直叩き。DO を起こさない）。失敗時は undefined。 */
export async function fetchCurrentSong(): Promise<
  CurrentSongPayload | undefined
> {
  const now = Date.now();
  if (ssrSongCache && ssrSongCache.expires > now) {
    return ssrSongCache.song;
  }

  const status = await mpdCommand("status");
  const song = await status.match({
    ok: async (statusRaw) => {
      const songid = parseMpdStatus(statusRaw).status.songid;
      if (!songid) return undefined;
      const current = await mpdCommand("currentsong");
      return current.match({
        ok: (currentsongRaw) =>
          currentSongFromMpdBridgeResponses(statusRaw, currentsongRaw),
        err: () => undefined,
      });
    },
    err: async () => undefined,
  });

  ssrSongCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    song,
  };
  return song;
}
