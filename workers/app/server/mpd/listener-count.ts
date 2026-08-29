
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import { mpdCommand } from "./bridge";
import { parseMpdStatus } from "./parse";

let ssrListenerCache: { expires: number; count: number } | null = null;

/** Inertia SSR 用（失敗時は 0）。短 TTL キャッシュで MPD 連打を抑える。 */
export async function fetchListenerCount(): Promise<number> {
  const now = Date.now();
  if (ssrListenerCache && ssrListenerCache.expires > now) {
    return ssrListenerCache.count;
  }

  const result = await mpdCommand("status");
  const count = result.match({
    ok: (raw) => parseMpdStatus(raw).listenerCount,
    err: () => 0,
  });

  ssrListenerCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    count,
  };
  return count;
}
