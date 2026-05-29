import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  mpdCommand,
  parseMpdRecords,
  parseMpdResponse,
  quoteMpdArg,
  recordToSong,
  type MpdAddInput,
  type Song,
} from "./mpd";

export async function listSongs(): Promise<Song[]> {
  const raw = await mpdCommand("playlistinfo");
  return parseMpdRecords(raw)
    .map(recordToSong)
    .filter((song): song is Song => song !== undefined)
    .sort((a, b) => a.pos - b.pos);
}

export async function findSong(id: number): Promise<Song | undefined> {
  const raw = await mpdCommand(`playlistid ${id}`);
  if (raw.includes("ACK")) return undefined;
  return recordToSong(parseMpdResponse(raw));
}

export async function createSong(input: MpdAddInput): Promise<Song> {
  const raw = await mpdCommand(`add ${quoteMpdArg(input.file)}`);
  const added = parseMpdResponse(raw);
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
  await mpdCommand(`deleteid ${id}`);
  return createSong(input);
}

export async function deleteSong(id: number): Promise<boolean> {
  const raw = await mpdCommand(`deleteid ${id}`);
  return !raw.includes("ACK");
}

const pathToField = (
  path: StandardSchemaV1.Issue["path"],
): string | undefined => {
  if (!path?.length) return undefined;
  const last = path[path.length - 1];
  if (typeof last === "object" && last !== null && "key" in last) {
    return String(last.key);
  }
  if (typeof last === "string" || typeof last === "number") {
    return String(last);
  }
  return undefined;
};

export const toFieldErrors = (
  issues: readonly StandardSchemaV1.Issue[],
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = pathToField(issue.path);
    if (!key || key in out) continue;
    out[key] = issue.message;
  }
  return out;
};

export const recoverInput = (data: unknown): MpdAddInput => {
  const obj = (data ?? {}) as Partial<MpdAddInput>;
  return {
    file: typeof obj.file === "string" ? obj.file : "",
  };
};
