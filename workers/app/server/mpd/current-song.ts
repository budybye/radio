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

function currentSongPayloadFromView(
  view: CurrentSongView,
): CurrentSongPayload | undefined {
  if (!view || "unchanged" in view) return undefined;
  return view;
}

/** Inertia SSR 用（mpc-bridge 直叩き。DO を起こさない） */
export async function fetchCurrentSongResult(): Promise<
  Result<CurrentSongPayload | undefined, MpdError>
> {
  const now = Date.now();
  if (ssrSongCache && ssrSongCache.expires > now) {
    return Result.ok(ssrSongCache.song);
  }

  const result = await getCurrentSongResult();
  if (result.isErr()) return result;

  const song = currentSongPayloadFromView(result.value);
  ssrSongCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    song,
  };
  return Result.ok(song);
}
