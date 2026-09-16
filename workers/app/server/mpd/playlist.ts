import { Result } from "better-result";

import type { QueueSongInput } from "../../schemas/queue";
import type { Song } from "../../schemas/mpd";
import { MpdTransportError, type MpdError } from "../../lib/radio/errors";
import { mpdCommand, quoteMpdArg } from "./bridge";
import { parseMpdRecords, parseMpdRecord } from "./parse";
import { recordToSong } from "./song";

export async function listSongs(): Promise<Result<Song[], MpdError>> {
  return (await mpdCommand("playlistinfo")).map((rawResponse) =>
    parseMpdRecords(rawResponse)
      .map(recordToSong)
      .filter((song): song is Song => song !== undefined)
      .sort((firstSong, secondSong) => firstSong.pos - secondSong.pos),
  );
}

export async function findSong(songId: number): Promise<Result<Song | undefined, MpdError>> {
  return (await mpdCommand(`playlistid ${songId}`)).map((rawResponse) =>
    recordToSong(parseMpdRecord(rawResponse)),
  );
}

export async function createSong(songInput: QueueSongInput): Promise<Result<Song, MpdError>> {
  const quotedFilePath = quoteMpdArg(songInput.file);

  if (quotedFilePath.isErr()) return quotedFilePath;

  return (await mpdCommand(`addid ${quotedFilePath.value}`)).andThenAsync(async (addResponse) => {
    const addedSongRecord = parseMpdRecord(addResponse);
    const songId = Number(addedSongRecord.Id);

    if (!Number.isFinite(songId)) {
      return Result.err(new MpdTransportError({ message: "failed to add song to playlist" }));
    }

    const foundSongResult = await findSong(songId);

    return foundSongResult.andThen((song) =>
      song
        ? Result.ok(song)
        : Result.err(
            new MpdTransportError({
              message: "failed to fetch added song",
            }),
          ),
    );
  });
}

export async function updateSong(
  songId: number,
  songInput: QueueSongInput,
): Promise<Result<Song | undefined, MpdError>> {
  const existingSongResult = await findSong(songId);

  if (existingSongResult.isErr()) return existingSongResult;

  if (!existingSongResult.value) return Result.ok(undefined);

  const createdSongResult = await createSong(songInput);

  if (createdSongResult.isErr()) return createdSongResult;

  const deleteResult = await mpdCommand(`deleteid ${songId}`);

  if (deleteResult.isErr()) return deleteResult;

  return createdSongResult;
}

export async function deleteSong(songId: number): Promise<Result<boolean, MpdError>> {
  return (await mpdCommand(`deleteid ${songId}`)).map(() => true);
}
