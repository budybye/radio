import type { CurrentSongPayload, RadioConfig } from "../lib/radio/types";
import type { QueueFormErrors } from "../schemas/queue";
import type { Song } from "../schemas/mpd";

/** Hono の動的ルートは PageProps 推論から漏れるため明示型を使う */
export type HomePageProps = {
  initialCurrentSong: CurrentSongPayload | undefined;
  listenerCount: number;
  config: RadioConfig;
};

export type QueueIndexPageProps = {
  tracks: Song[];
};

export type QueueNewPageProps = {
  values: { file: string };
  errors: QueueFormErrors;
};

export type QueueEditPageProps = {
  song: Song;
  errors: QueueFormErrors;
};

export type QueueShowPageProps = {
  song: Song;
};
