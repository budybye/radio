import { Result } from "better-result";

import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import type { MpdError } from "../../lib/radio/errors";
import { mpdCommand } from "./bridge";
import { parseMpdStatus } from "./parse";

let ssrListenerCache: { expires: number; count: number } | null = null;

/** Inertia SSR 用（短 TTL キャッシュで MPD 連打を抑える） */
export async function fetchListenerCountResult(): Promise<
  Result<number, MpdError>
> {
  const now = Date.now();
  if (ssrListenerCache && ssrListenerCache.expires > now) {
    return Result.ok(ssrListenerCache.count);
  }

  const result = await mpdCommand("status");
  if (result.isErr()) return result;

  const count = parseMpdStatus(result.value).listenerCount;
  ssrListenerCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    count,
  };
  return Result.ok(count);
}

/** SSR 境界での劣化ラッパー（失敗時は 0） */
export async function fetchListenerCount(): Promise<number> {
  return (await fetchListenerCountResult()).match({
    ok: (count) => count,
    err: () => 0,
  });
}
