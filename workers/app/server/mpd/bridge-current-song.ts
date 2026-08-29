import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../../lib/radio/types";
import { parseMpdRecord, parseMpdStatus } from "./parse";
import { recordToCurrentSong } from "./song";

/** GET /currentsong の songid クエリが status と一致するときの短絡応答 */
export function unchangedCurrentSongIfMatching(
  statusRaw: string,
  clientSongid?: string,
): Extract<CurrentSongView, { unchanged: true }> | null {
  const songid = parseMpdStatus(statusRaw).status.songid ?? "";
  if (!songid) return null;
  if (clientSongid !== undefined && clientSongid === songid) {
    return { unchanged: true, songid };
  }
  return null;
}

/** mpc-bridge の status + currentsong 応答から再生中曲を組み立てる（SSR / ops 共通） */
export function currentSongFromMpdBridgeResponses(
  statusRaw: string,
  currentsongRaw: string,
): CurrentSongPayload | undefined {
  const songid = parseMpdStatus(statusRaw).status.songid;
  if (!songid) return undefined;
  const song = recordToCurrentSong(parseMpdRecord(currentsongRaw));
  if (!song) return undefined;
  return { ...song, songid };
}
