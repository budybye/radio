import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { parseMpdRecord, parseMpdStatus } from "../app/server/mpd/parse";

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

describe("mpd-stub fixture contract", () => {
  it("status.txt parses to contract listener count and playback state", async () => {
    const contract = await loadContract();
    const raw = await readFile(join(FIXTURES, "status.txt"), "utf8");
    const parsed = parseMpdStatus(raw);

    expect(parsed.listenerCount).toBe(contract.status.listeners);
    expect(parsed.status.state).toBe(contract.status.state);
    expect(parsed.status.songid).toBe(contract.status.songid);
  });

  it("currentsong.txt parses to contract metadata fields", async () => {
    const contract = await loadContract();
    const raw = await readFile(join(FIXTURES, "currentsong.txt"), "utf8");

    expect(parseMpdRecord(raw)).toMatchObject(contract.currentsong);
  });
});
