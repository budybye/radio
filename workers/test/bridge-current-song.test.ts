import { describe, expect, it } from "vitest";

import {
  currentSongFromMpdBridgeResponses,
  unchangedCurrentSongIfMatching,
} from "../app/server/mpd/bridge-current-song";
import { parseMpdStatus } from "../app/server/mpd/parse";
import {
  loadMpdFixtureContract,
  readMpdFixture,
} from "./fixtures/mpd/contract";

describe("current song from mpc-bridge MPD responses", () => {
  it("builds CurrentSongPayload from status.txt + currentsong.txt fixtures", async () => {
    const contract = await loadMpdFixtureContract();
    const statusRaw = await readMpdFixture("status.txt");
    const currentsongRaw = await readMpdFixture("currentsong.txt");

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

  it("returns unchanged when client songid matches fixture status", async () => {
    const contract = await loadMpdFixtureContract();
    const statusRaw = await readMpdFixture("status.txt");

    expect(
      unchangedCurrentSongIfMatching(statusRaw, contract.status.songid),
    ).toEqual({ unchanged: true, songid: contract.status.songid });
  });

  it("returns undefined when status has no songid", async () => {
    const statusRaw = "state: stop\nOK\n";
    const currentsongRaw = await readMpdFixture("currentsong.txt");

    expect(
      currentSongFromMpdBridgeResponses(statusRaw, currentsongRaw),
    ).toBeUndefined();
  });
});
