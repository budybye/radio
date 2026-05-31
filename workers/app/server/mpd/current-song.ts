import { Result, type SerializedResult } from "better-result";
import { env } from "cloudflare:workers";

import type { MpdError } from "../../lib/radio/errors";
import type {
  CurrentSongPayload,
  CurrentSongView,
} from "../../lib/radio/types";
import { SSR_CURRENT_SONG_CACHE_MS } from "../../lib/radio/constants";
import { mpdCommand } from "./command";
import { mpdAgentStub } from "../../../worker/mpd-agent";
import { parseMpdResponse } from "./parse";
import { recordToCurrentSong } from "./song";

let ssrSongCache: {
  expires: number;
  song: CurrentSongPayload | undefined;
} | null = null;

export async function getStatusResult(): Promise<
  Result<Record<string, string>, MpdError>
> {
  const result = await mpdCommand("status");
  if (result.isErr()) return result;
  return Result.ok(parseMpdResponse(result.value));
}

export async function fetchCurrentSongResult(): Promise<
  Result<Pick<CurrentSongPayload, "title" | "artist" | "album" | "file"> | undefined, MpdError>
> {
  const result = await mpdCommand("currentsong");
  if (result.isErr()) return result;
  return Result.ok(recordToCurrentSong(parseMpdResponse(result.value)));
}

export async function getCurrentSongResult(
  clientSongid?: string,
): Promise<Result<CurrentSongView, MpdError>> {
  const stub = await mpdAgentStub(env);
  const serialized = (await stub.getCurrentSongView(
    clientSongid,
  )) as SerializedResult<CurrentSongView, MpdError>;
  return Result.deserialize(serialized);
}

/** Inertia SSR 用（失敗時は undefined）。短 TTL キャッシュで MPD 連打を抑える。 */
export async function fetchCurrentSong(): Promise<
  CurrentSongPayload | undefined
> {
  const now = Date.now();
  if (ssrSongCache && ssrSongCache.expires > now) {
    return ssrSongCache.song;
  }

  const result = await getCurrentSongResult();
  let song: CurrentSongPayload | undefined;
  if (result.isErr()) song = undefined;
  else {
    const data = result.value;
    song =
      data === null || "unchanged" in data ? undefined : data;
  }

  ssrSongCache = {
    expires: now + SSR_CURRENT_SONG_CACHE_MS,
    song,
  };
  return song;
}
