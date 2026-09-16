import type { CurrentSongPayload, CurrentSongView } from "../../lib/radio/types";
import { parseMpdRecord, parseMpdStatus } from "./parse";
import { recordToCurrentSong } from "./song";

/** GET /currentsong の songid クエリが status と一致するときの短絡応答 */
export function unchangedCurrentSongIfMatching(
  rawStatusResponse: string,
  clientSongId?: string,
): Extract<CurrentSongView, { unchanged: true }> | null {
  const songId = parseMpdStatus(rawStatusResponse).status.songid ?? "";

  if (!songId) return null;

  if (clientSongId !== undefined && clientSongId === songId) {
    return { unchanged: true, songid: songId };
  }

  return null;
}

/** mpc-bridge の status + currentsong 応答から再生中曲を組み立てる（SSR / ops 共通） */
export function currentSongFromMpdBridgeResponses(
  rawStatusResponse: string,
  rawCurrentSongResponse: string,
): CurrentSongPayload | undefined {
  const songId = parseMpdStatus(rawStatusResponse).status.songid;

  if (!songId) return undefined;
  const currentSong = recordToCurrentSong(parseMpdRecord(rawCurrentSongResponse));

  if (!currentSong) return undefined;

  return { ...currentSong, songid: songId };
}
