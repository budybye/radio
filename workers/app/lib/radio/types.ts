import type { SerializedResult } from "better-result";

import type { MpdError } from "./errors";

export type Song = {
  id: number;
  pos: number;
  file: string;
  title: string;
  artist: string;
  album: string;
  time?: number;
};

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

/** Cap'n Web push コールバック（`/rpc` WS watch 用） */
export type CurrentSongListener = (
  payload: CurrentSongSerialized,
) => void | Promise<boolean>;

/** Cap'n Web RPC — Worker が MpdAgent DO へブリッジ */
export interface RadioPublicApi {
  getCurrentSong(songid?: string): Promise<CurrentSongSerialized>;

  /** WS 接続中: songid 変化時だけ listener を呼ぶ（同曲は MPD status のみ） */
  watchCurrentSong(
    listener: CurrentSongListener,
    clientSongid?: string,
  ): Promise<void>;
}
