import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";

export const MPD_FIXTURES_DIR = join(import.meta.dirname);

const displayExpectationSchema = v.object({
  headline: v.string(),
  artist: v.string(),
  album: v.string(),
  variant: v.nullable(v.literal("instrumental")),
});

/** mpd-stub / E2E / unit tests の共有正本（contract.json） */
export const mpdFixtureContractSchema = v.object({
  version: v.optional(v.number()),
  description: v.optional(v.string()),
  status: v.object({
    listeners: v.number(),
    state: v.string(),
    songid: v.string(),
  }),
  currentsong: v.record(v.string(), v.string()),
  currentsongInstrumental: v.optional(v.record(v.string(), v.string())),
  display: v.optional(
    v.object({
      regular: displayExpectationSchema,
      instrumental: displayExpectationSchema,
      noSong: displayExpectationSchema,
    }),
  ),
  ui: v.optional(
    v.object({
      listenersLabel: v.string(),
      speakerClass: v.string(),
      titleFallback: v.string(),
    }),
  ),
});

export type MpdFixtureContract = v.InferOutput<typeof mpdFixtureContractSchema>;

export async function loadMpdFixtureContract(): Promise<MpdFixtureContract> {
  const raw = await readFile(join(MPD_FIXTURES_DIR, "contract.json"), "utf8");
  return v.parse(mpdFixtureContractSchema, JSON.parse(raw));
}

export async function readMpdFixture(filename: string): Promise<string> {
  return readFile(join(MPD_FIXTURES_DIR, filename), "utf8");
}
