import type { SerializedResult } from "better-result";

import type { Song } from "../../schemas/mpd";
import type { MpdError } from "./errors";

export type { Song };

/** 再生中曲 API / RPC の戻り型 */
export type CurrentSongPayload = Pick<
  Song,
  "title" | "artist" | "album" | "file"
> & { songid: string };

export type CurrentSongView =
  | { unchanged: true; songid: string }
  | CurrentSongPayload
  | null;

export type CurrentSongSerialized = SerializedResult<
  CurrentSongView,
  MpdError
>;

/** SSR → クライアント注入（stream URL 等） */
export type RadioConfig = {
  streamUrl: string;
  titleFallback: string;
};
