import { safeParse } from "valibot";

import { mpdSongSchema, songDisplayTitle } from "../../schemas/mpd";
import type { Song } from "../../schemas/mpd";

export function recordToSong(record: Record<string, string>): Song | undefined {
  const parsed = safeParse(mpdSongSchema, record);
  return parsed.success ? parsed.output : undefined;
}

/** `currentsong` 用。Id/Pos が無くてもタイトル表示できる */
export function recordToCurrentSong(
  record: Record<string, string>,
): Pick<Song, "title" | "artist" | "album" | "file"> | undefined {
  const file = record.file;
  if (!file) return undefined;
  return {
    file,
    title: songDisplayTitle(file, record.Title),
    artist: record.Artist ?? "",
    album: record.Album ?? "",
  };
}
