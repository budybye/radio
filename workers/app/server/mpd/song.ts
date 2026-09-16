import { safeParse } from "valibot";

import { mpdSongSchema, songDisplayTitle } from "../../schemas/mpd";
import type { Song } from "../../schemas/mpd";

export function recordToSong(mpdRecord: Record<string, string>): Song | undefined {
  const songParseResult = safeParse(mpdSongSchema, mpdRecord);

  return songParseResult.success ? songParseResult.output : undefined;
}

/** `currentsong` 用。Id/Pos が無くてもタイトル表示できる */
export function recordToCurrentSong(
  mpdRecord: Record<string, string>,
): Pick<Song, "title" | "artist" | "album" | "file"> | undefined {
  const file = mpdRecord.file;

  if (!file) return undefined;

  return {
    file,
    title: songDisplayTitle(file, mpdRecord.Title),
    artist: mpdRecord.Artist ?? "",
    album: mpdRecord.Album ?? "",
  };
}
