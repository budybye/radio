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

import type { ConfiguredRadioStation, RadioStationId } from "./stations";

/** SSR → クライアント注入（stream URL 等） */
export type RadioConfig = {
  stations: readonly ConfiguredRadioStation[];
  defaultStationId: RadioStationId;
  titleFallback: string;
};
