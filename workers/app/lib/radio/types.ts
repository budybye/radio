import type { Song } from "../../schemas/mpd";

/** 再生中曲 API / RPC の戻り型 */
export type CurrentSongPayload = Pick<
  Song,
  "title" | "artist" | "album" | "file"
> & { songid: string };

export type CurrentSongView =
  | { unchanged: true; songid: string }
  | CurrentSongPayload
  | null;

/** SSR → クライアント注入（stream URL 等） */
export type RadioConfig = {
  streamUrl: string;
  titleFallback: string;
};
