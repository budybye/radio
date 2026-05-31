import { Result } from "better-result";
import type { MpdAddInput } from "../schemas/mpd";
import type { Song } from "../lib/radio/types";
import {
  mpdCommand,
  parseMpdRecords,
  parseMpdResponse,
  quoteMpdArg,
  recordToSong,
} from "./mpd";

export async function listSongs(): Promise<Song[]> {
  const result = await mpdCommand("playlistinfo");
  if (Result.isError(result)) return [];
  return parseMpdRecords(result.value)
    .map(recordToSong)
    .filter((song): song is Song => song !== undefined)
    .sort((a, b) => a.pos - b.pos);
}

export async function findSong(id: number): Promise<Song | undefined> {
  const result = await mpdCommand(`playlistid ${id}`);
  if (Result.isError(result)) return undefined;
  return recordToSong(parseMpdResponse(result.value));
}

export async function createSong(input: MpdAddInput): Promise<Song> {
  const result = await mpdCommand(`add ${quoteMpdArg(input.file)}`);
  if (Result.isError(result)) throw result.error;
  const added = parseMpdResponse(result.value);
  const id = Number(added.Id);
  if (!Number.isFinite(id)) {
    throw new Error("failed to add song to playlist");
  }
  const song = await findSong(id);
  if (!song) {
    throw new Error("failed to fetch added song");
  }
  return song;
}

export async function updateSong(
  id: number,
  input: MpdAddInput,
): Promise<Song | undefined> {
  const existing = await findSong(id);
  if (!existing) return undefined;
  const del = await mpdCommand(`deleteid ${id}`);
  if (Result.isError(del)) return undefined;
  return createSong(input);
}

export async function deleteSong(id: number): Promise<boolean> {
  const result = await mpdCommand(`deleteid ${id}`);
  return Result.isOk(result);
}
