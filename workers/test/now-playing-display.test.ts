import { describe, expect, it } from "vitest";

import { formatNowPlayingDisplay } from "../app/lib/radio/now-playing";
import { parseMpdRecord } from "../app/server/mpd/parse";
import { recordToCurrentSong } from "../app/server/mpd/song";
import {
  loadMpdFixtureContract,
  readMpdFixture,
} from "./fixtures/mpd/contract";

async function displayFromCurrentsongFixture(
  filename: string,
): Promise<ReturnType<typeof formatNowPlayingDisplay>> {
  const raw = await readMpdFixture(filename);
  const song = recordToCurrentSong(parseMpdRecord(raw));
  if (!song) {
    throw new Error(`fixture ${filename} did not parse to a current song`);
  }
  return formatNowPlayingDisplay(song, "unused-fallback");
}

describe("now-playing display from MPD fixtures", () => {
  it("formats regular currentsong.txt per contract display.regular", async () => {
    const contract = await loadMpdFixtureContract();
    const display = await displayFromCurrentsongFixture("currentsong.txt");

    expect(contract.display).toBeDefined();
    expect(display).toEqual(contract.display!.regular);
    expect(parseMpdRecord(await readMpdFixture("currentsong.txt"))).toMatchObject(
      contract.currentsong,
    );
  });

  it("formats instrumental currentsong-instrumental.txt per contract display.instrumental", async () => {
    const contract = await loadMpdFixtureContract();
    const display = await displayFromCurrentsongFixture(
      "currentsong-instrumental.txt",
    );

    expect(contract.display).toBeDefined();
    expect(display).toEqual(contract.display!.instrumental);
    expect(
      parseMpdRecord(await readMpdFixture("currentsong-instrumental.txt")),
    ).toMatchObject(contract.currentsongInstrumental!);
  });

  it("uses titleFallback from contract when song is absent", async () => {
    const contract = await loadMpdFixtureContract();

    expect(contract.ui).toBeDefined();
    expect(formatNowPlayingDisplay(null, contract.ui!.titleFallback)).toEqual(
      contract.display!.noSong,
    );
  });
});
