import * as v from "valibot";

import { postSongInputSchema as basePostSongInputSchema } from "../posts";

const exampleSong = {
  id: 1,
  pos: 0,
  file: "music/Example Artist/Example Album/01-track.mp3",
  title: "Come Down Riddim (Instrumental)",
  artist: "Example Artist",
  album: "Example Album",
  time: 214,
} as const;

/** キュー曲（mpdSongSchema の output wire 形） */
export const songWireSchema = v.pipe(
  v.object({
    id: v.number(),
    pos: v.number(),
    file: v.string(),
    title: v.string(),
    artist: v.string(),
    album: v.string(),
    time: v.optional(v.number()),
  }),
  v.metadata({ ref: "Song" }),
);

export const songListSchema = v.pipe(
  v.array(songWireSchema),
  v.metadata({ ref: "SongList" }),
);

export const postSongInputSchema = v.pipe(
  basePostSongInputSchema,
  v.examples([{ file: exampleSong.file }]),
);
