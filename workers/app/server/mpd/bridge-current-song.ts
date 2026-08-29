import type { CurrentSongPayload } from "../../lib/radio/types";
import { parseMpdRecord, parseMpdStatus } from "./parse";
import { recordToCurrentSong } from "./song";

/** mpc-bridge の status + currentsong 応答から再生中曲を組み立てる（テスト・SSR 共通） */
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
