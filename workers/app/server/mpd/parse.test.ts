import { describe, expect, it } from "vitest";

import {
  loadMpdFixtureContract,
  readMpdFixture,
} from "../../../test/fixtures/mpd/contract";
import {
  mpdFields,
  parseListenerCount,
  parseMpdRecord,
  parseMpdRecords,
  parseMpdStatus,
} from "./parse";

describe("mpdFields", () => {
  it("drops OK/ACK lines and parses key: value pairs from status.txt fixture", async () => {
    const raw = await readMpdFixture("status.txt");
    const fields = mpdFields(raw);
    const contract = await loadMpdFixtureContract();

    expect(fields.get("state")).toBe(contract.status.state);
    expect(fields.get("listeners")).toBe(String(contract.status.listeners));
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
  it("parses status.txt to contract listener count and playback state", async () => {
    const contract = await loadMpdFixtureContract();
    const raw = await readMpdFixture("status.txt");
    const parsed = parseMpdStatus(raw);

    expect(parsed.listenerCount).toBe(contract.status.listeners);
    expect(parsed.status.state).toBe(contract.status.state);
    expect(parsed.status.songid).toBe(contract.status.songid);
    expect(parsed.fieldCount).toBeGreaterThan(4);
  });

  it("returns zero listeners when field is missing", () => {
    const parsed = parseMpdStatus("state: stop\nOK");
    expect(parsed.listenerCount).toBe(0);
    expect(parsed.status.state).toBe("stop");
  });
});

describe("parseMpdRecord", () => {
  it("parses currentsong.txt to contract metadata fields", async () => {
    const contract = await loadMpdFixtureContract();
    const raw = await readMpdFixture("currentsong.txt");

    expect(parseMpdRecord(raw)).toMatchObject(contract.currentsong);
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
