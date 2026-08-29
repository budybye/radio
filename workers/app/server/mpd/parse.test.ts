import { describe, expect, it } from "vitest";

import {
  mpdFields,
  parseListenerCount,
  parseMpdRecord,
  parseMpdRecords,
  parseMpdStatus,
} from "./parse";

const STATUS_FIXTURE = `volume: 80
state: play
songid: 42
song: 3
time: 120:300
elapsed: 45.123
bitrate: 320
duration: 300.000
audio: mp3
listeners: 7
OK`;

const CURRENTSONG_FIXTURE = `file: music/track.flac
Time: 245
Artist: Test Artist
Title: Fixture Song
Album: E2E
OK`;

describe("mpdFields", () => {
  it("drops OK/ACK lines and parses key: value pairs", () => {
    const fields = mpdFields(STATUS_FIXTURE);
    expect(fields.get("state")).toBe("play");
    expect(fields.get("listeners")).toBe("7");
    expect(fields.has("OK")).toBe(false);
  });
});

describe("parseListenerCount", () => {
  it.each([
    ["7", 7],
    ["0", 0],
    [undefined, 0],
    ["", 0],
    ["-1", 0],
    ["abc", 0],
    ["3.5", 3],
  ])("parseListenerCount(%j) -> %i", (input, expected) => {
    expect(parseListenerCount(input)).toBe(expected);
  });
});

describe("parseMpdStatus", () => {
  it("extracts known status fields and listener count", () => {
    const parsed = parseMpdStatus(STATUS_FIXTURE);
    expect(parsed.status.state).toBe("play");
    expect(parsed.status.songid).toBe("42");
    expect(parsed.listenerCount).toBe(7);
    expect(parsed.fieldCount).toBeGreaterThan(4);
  });

  it("returns zero listeners when field is missing", () => {
    const parsed = parseMpdStatus("state: stop\nOK");
    expect(parsed.listenerCount).toBe(0);
    expect(parsed.status.state).toBe("stop");
  });
});

describe("parseMpdRecord", () => {
  it("returns a flat record map", () => {
    expect(parseMpdRecord(CURRENTSONG_FIXTURE)).toMatchObject({
      file: "music/track.flac",
      Artist: "Test Artist",
      Title: "Fixture Song",
    });
  });
});

describe("parseMpdRecords", () => {
  it("splits multi-file responses on file: lines", () => {
    const raw = `file: a.flac
Title: A
file: b.flac
Title: B
OK`;
    expect(parseMpdRecords(raw)).toEqual([
      { file: "a.flac", Title: "A" },
      { file: "b.flac", Title: "B" },
    ]);
  });
});
