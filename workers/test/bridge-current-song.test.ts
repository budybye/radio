import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { currentSongFromMpdBridgeResponses } from "../app/server/mpd/bridge-current-song";
import { parseMpdStatus } from "../app/server/mpd/parse";

const FIXTURES = join(import.meta.dirname, "fixtures", "mpd");

const mpdFixtureContractSchema = v.object({
  status: v.object({
    listeners: v.number(),
    state: v.string(),
    songid: v.string(),
  }),
  currentsong: v.record(v.string(), v.string()),
});

type MpdFixtureContract = v.InferOutput<typeof mpdFixtureContractSchema>;

async function loadContract(): Promise<MpdFixtureContract> {
  const raw = await readFile(join(FIXTURES, "contract.json"), "utf8");
  return v.parse(mpdFixtureContractSchema, JSON.parse(raw));
}

describe("current song from mpc-bridge MPD responses", () => {
  it("builds CurrentSongPayload from status.txt + currentsong.txt fixtures", async () => {
    const contract = await loadContract();
    const statusRaw = await readFile(join(FIXTURES, "status.txt"), "utf8");
    const currentsongRaw = await readFile(
      join(FIXTURES, "currentsong.txt"),
      "utf8",
    );

    const song = currentSongFromMpdBridgeResponses(statusRaw, currentsongRaw);

    expect(parseMpdStatus(statusRaw).listenerCount).toBe(
      contract.status.listeners,
    );
    expect(song).toMatchObject({
      songid: contract.status.songid,
      title: contract.currentsong.Title,
      artist: contract.currentsong.Artist,
      album: contract.currentsong.Album,
      file: contract.currentsong.file,
    });
  });

  it("returns undefined when status has no songid", async () => {
    const statusRaw = "state: stop\nOK\n";
    const currentsongRaw = await readFile(
      join(FIXTURES, "currentsong.txt"),
      "utf8",
    );

    expect(
      currentSongFromMpdBridgeResponses(statusRaw, currentsongRaw),
    ).toBeUndefined();
  });
});
