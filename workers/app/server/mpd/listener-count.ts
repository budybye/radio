import { Result } from "better-result";

import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import type { MpdError } from "../../lib/radio/errors";
import { mpdCommand } from "./bridge";
import { parseMpdStatus } from "./parse";

let ssrListenerCache: { expiresAt: number; listenerCount: number } | null = null;

/**
 * Inertia SSR listener count (short TTL cache). Live HTTP routes should call
 * `mpdCommand("status")` directly instead of this helper.
 */
export async function getCachedListenerCountForSsr(): Promise<Result<number, MpdError>> {
  const currentTime = Date.now();

  if (ssrListenerCache && ssrListenerCache.expiresAt > currentTime) {
    return Result.ok(ssrListenerCache.listenerCount);
  }

  const statusResult = await mpdCommand("status");

  if (statusResult.isErr()) return statusResult;

  const listenerCount = parseMpdStatus(statusResult.value).listenerCount;
  ssrListenerCache = {
    expiresAt: currentTime + SSR_CURRENT_SONG_CACHE_MS,
    listenerCount,
  };

  return Result.ok(listenerCount);
}
