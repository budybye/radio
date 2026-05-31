import { Result } from "better-result";

import type { PostSongInput } from "../../schemas/posts";
import type { Song } from "../../lib/radio/types";
import { MpdTransportError, type MpdError } from "../../lib/radio/errors";
import { mpdCommand, quoteMpdArg } from "./transport";
import { parseMpdRecords, parseMpdResponse } from "./parse";
import { recordToSong } from "./song";

export async function listSongs(): Promise<Result<Song[], MpdError>> {
  return (await mpdCommand("playlistinfo")).map((raw) =>
    parseMpdRecords(raw)
      .map(recordToSong)
      .filter((song): song is Song => song !== undefined)
      .sort((a, b) => a.pos - b.pos),
  );
}

export async function findSong(
  id: number,
): Promise<Result<Song | undefined, MpdError>> {
  return (await mpdCommand(`playlistid ${id}`)).map((raw) =>
    recordToSong(parseMpdResponse(raw)),
  );
}

export async function createSong(
  input: PostSongInput,
): Promise<Result<Song, MpdError>> {
  return (await mpdCommand(`addid ${quoteMpdArg(input.file)}`)).andThenAsync(
    async (raw) => {
      const added = parseMpdResponse(raw);
      const id = Number(added.Id);
      if (!Number.isFinite(id)) {
        return Result.err(
          new MpdTransportError({ message: "failed to add song to playlist" }),
        );
      }
      const song = await findSong(id);
      return song.andThen((s) =>
        s
          ? Result.ok(s)
          : Result.err(
              new MpdTransportError({
                message: "failed to fetch added song",
              }),
            ),
      );
    },
  );
}

export async function updateSong(
  id: number,
  input: PostSongInput,
): Promise<Result<Song | undefined, MpdError>> {
  const existing = await findSong(id);
  if (existing.isErr()) return existing;
  if (!existing.value) return Result.ok(undefined);

  const created = await createSong(input);
  if (created.isErr()) return created;

  const del = await mpdCommand(`deleteid ${id}`);
  if (del.isErr()) return del;

  return created;
}

export async function deleteSong(
  id: number,
): Promise<Result<boolean, MpdError>> {
  return (await mpdCommand(`deleteid ${id}`)).map(() => true);
}
