import { Result } from "better-result";

import type { MpdError } from "../../lib/radio/errors";

import type { CurrentSongPayload, CurrentSongView } from "../../lib/radio/types";
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import { mpdCommand } from "./bridge";
import {
  currentSongFromMpdBridgeResponses,
  unchangedCurrentSongIfMatching,
} from "./bridge-current-song";
import { parseMpdStatus } from "./parse";

let ssrSongCache: {
  expiresAt: number;
  payload: CurrentSongPayload | undefined;
} | null = null;

/**
 * Live mpc-bridge query (no SSR cache). For Inertia SSR use
 * {@link getCachedCurrentSongForSsr}.
 */
export async function queryCurrentSongFromBridge(
  clientSongId?: string,
): Promise<Result<CurrentSongView, MpdError>> {
  const statusResult = await mpdCommand("status");

  if (statusResult.isErr()) return Result.err(statusResult.error);

  const rawStatusResponse = statusResult.value;
  const unchangedView = unchangedCurrentSongIfMatching(rawStatusResponse, clientSongId);

  if (unchangedView) return Result.ok(unchangedView);
  const songId = parseMpdStatus(rawStatusResponse).status.songid ?? "";

  if (!songId) return Result.ok(null);

  const currentSongResult = await mpdCommand("currentsong");

  if (currentSongResult.isErr()) return Result.err(currentSongResult.error);

  const currentSong = currentSongFromMpdBridgeResponses(rawStatusResponse, currentSongResult.value);

  return Result.ok(currentSong ?? null);
}

function currentSongPayloadFromView(view: CurrentSongView): CurrentSongPayload | undefined {
  if (!view || "unchanged" in view) return undefined;

  return view;
}

/**
 * Inertia SSR current song (memory cache, does not wake MpdAgent). Live HTTP
 * routes should use {@link queryCurrentSongFromBridge}.
 */
export async function getCachedCurrentSongForSsr(): Promise<
  Result<CurrentSongPayload | undefined, MpdError>
> {
  const currentTime = Date.now();

  if (ssrSongCache && ssrSongCache.expiresAt > currentTime) {
    return Result.ok(ssrSongCache.payload);
  }

  const currentSongResult = await queryCurrentSongFromBridge();

  if (currentSongResult.isErr()) return currentSongResult;

  const currentSongPayload = currentSongPayloadFromView(currentSongResult.value);
  ssrSongCache = {
    expiresAt: currentTime + SSR_CURRENT_SONG_CACHE_MS,
    payload: currentSongPayload,
  };

  return Result.ok(currentSongPayload);
}
