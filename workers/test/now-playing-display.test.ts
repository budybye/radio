import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { formatNowPlayingDisplay } from "../app/lib/radio/now-playing";
import { parseMpdRecord } from "../app/server/mpd/parse";
import { recordToCurrentSong } from "../app/server/mpd/song";

const FIXTURES = join(import.meta.dirname, "fixtures", "mpd");

const mpdFixtureContractSchema = v.object({
  currentsong: v.record(v.string(), v.string()),
  currentsongInstrumental: v.record(v.string(), v.string()),
  display: v.object({
    regular: v.object({
      headline: v.string(),
      artist: v.string(),
      album: v.string(),
      variant: v.nullable(v.literal("instrumental")),
    }),
    instrumental: v.object({
      headline: v.string(),
      artist: v.string(),
      album: v.string(),
      variant: v.nullable(v.literal("instrumental")),
    }),
    noSong: v.object({
      headline: v.string(),
      artist: v.string(),
      album: v.string(),
      variant: v.nullable(v.literal("instrumental")),
    }),
  }),
  ui: v.object({
    titleFallback: v.string(),
  }),
});

type MpdFixtureContract = v.InferOutput<typeof mpdFixtureContractSchema>;

async function loadContract(): Promise<MpdFixtureContract> {
  const raw = await readFile(join(FIXTURES, "contract.json"), "utf8");
  return v.parse(mpdFixtureContractSchema, JSON.parse(raw));
}

async function displayFromCurrentsongFixture(
  filename: string,
): Promise<ReturnType<typeof formatNowPlayingDisplay>> {
  const raw = await readFile(join(FIXTURES, filename), "utf8");
  const song = recordToCurrentSong(parseMpdRecord(raw));
  if (!song) {
    throw new Error(`fixture ${filename} did not parse to a current song`);
  }
  return formatNowPlayingDisplay(song, "unused-fallback");
}

describe("now-playing display from MPD fixtures", () => {
  it("formats regular currentsong.txt per contract display.regular", async () => {
    const contract = await loadContract();
    const display = await displayFromCurrentsongFixture("currentsong.txt");

    expect(display).toEqual(contract.display.regular);
    expect(parseMpdRecord(await readFile(join(FIXTURES, "currentsong.txt"), "utf8"))).toMatchObject(
      contract.currentsong,
    );
  });

  it("formats instrumental currentsong-instrumental.txt per contract display.instrumental", async () => {
    const contract = await loadContract();
    const display = await displayFromCurrentsongFixture("currentsong-instrumental.txt");

    expect(display).toEqual(contract.display.instrumental);
    expect(
      parseMpdRecord(
        await readFile(join(FIXTURES, "currentsong-instrumental.txt"), "utf8"),
      ),
    ).toMatchObject(contract.currentsongInstrumental);
  });

  it("uses titleFallback from contract when song is absent", async () => {
    const contract = await loadContract();

    expect(formatNowPlayingDisplay(null, contract.ui.titleFallback)).toEqual(
      contract.display.noSong,
    );
  });
});
