import { Result } from "better-result";

import type { MpdError } from "../../lib/radio/errors";

import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../../lib/radio/types";
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import { mpdCommand } from "./bridge";
import {
  currentSongFromMpdBridgeResponses,
  unchangedCurrentSongIfMatching,
} from "./bridge-current-song";
import { parseMpdStatus } from "./parse";

let ssrSongCache: {
  expires: number;
  song: CurrentSongPayload | undefined;
} | null = null;

export async function getCurrentSongResult(
  clientSongid?: string,
): Promise<Result<CurrentSongView, MpdError>> {
  const status = await mpdCommand("status");
  if (status.isErr()) return Result.err(status.error);

  const statusRaw = status.value;
  const unchanged = unchangedCurrentSongIfMatching(statusRaw, clientSongid);
  if (unchanged) return Result.ok(unchanged);
  const songid = parseMpdStatus(statusRaw).status.songid ?? "";
  if (!songid) return Result.ok(null);

  const current = await mpdCommand("currentsong");
  if (current.isErr()) return Result.err(current.error);

  const song = currentSongFromMpdBridgeResponses(statusRaw, current.value);
  return Result.ok(song ?? null);
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
