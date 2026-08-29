import type { CurrentSongPayload, RadioConfig } from "../lib/radio/types";
import type { PostFormErrors } from "../schemas/posts";
import type { Song } from "../schemas/mpd";

/** Hono の動的ルートは PageProps 推論から漏れるため明示型を使う */
export type HomePageProps = {
  song: CurrentSongPayload | undefined;
  listenerCount: number;
  config: RadioConfig;
};

export type PostsIndexPageProps = {
  posts: Song[];
};

export type PostsNewPageProps = {
  values: { file: string };
  errors: PostFormErrors;
};

export type PostsEditPageProps = {
  post: Song;
  errors: PostFormErrors;
};

export type PostsShowPageProps = {
  post: Song;
};
