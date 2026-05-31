import { safeParse } from "valibot";

import { mpdSongRecordSchema } from "../../schemas/mpd";
import type { Song } from "../../lib/radio/types";

function songDisplayTitle(file: string, title?: string): string {
  return title || file.split("/").pop() || file;
}

export function recordToSong(record: Record<string, string>): Song | undefined {
  const parsed = safeParse(mpdSongRecordSchema, record);
  if (!parsed.success) return undefined;

  const id = Number(record.Id);
  const pos = Number(record.Pos);
  if (!Number.isFinite(id) || !Number.isFinite(pos)) return undefined;

  const { file, Title, Artist, Album, Time } = parsed.output;
  return {
    id,
    pos,
    file,
    title: songDisplayTitle(file, Title),
    artist: Artist ?? "",
    album: Album ?? "",
    time: Time ? Number(Time) : undefined,
  };
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
