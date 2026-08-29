import { type ChildProcess, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as v from "valibot";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const FIXTURES = join(import.meta.dirname, "fixtures", "mpd");
const HOST = "127.0.0.1";
const PORT = 18_081;
const BASE = `http://${HOST}:${PORT}`;

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

async function waitForStubReady(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/mpd.cgi?cmd=ping`);
      if (response.ok) {
        return;
      }
    } catch {
      // retry until stub listens
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("mpd-stub did not become ready in time");
}

let stubProcess: ChildProcess | undefined;

beforeAll(async () => {
  stubProcess = spawn(process.execPath, [join(import.meta.dirname, "mpd-stub.mjs")], {
    env: {
      ...process.env,
      MPD_STUB_HOST: HOST,
      MPD_STUB_PORT: String(PORT),
    },
    stdio: "pipe",
  });

  await waitForStubReady();
}, 15_000);

afterAll(async () => {
  if (!stubProcess?.pid) {
    return;
  }

  stubProcess.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    stubProcess?.once("exit", () => resolve());
    setTimeout(() => {
      stubProcess?.kill("SIGKILL");
      resolve();
    }, 2_000);
  });
});

describe("mpd-stub HTTP contract", () => {
  it("ping returns ok:true JSON", async () => {
    const response = await fetch(`${BASE}/mpd.cgi?cmd=ping`);
    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("status serves fixture listener count and playback state", async () => {
    const contract = await loadContract();
    const response = await fetch(`${BASE}/mpd.cgi?cmd=status`);
    const body = await response.text();

    expect(body).toContain(`listeners: ${contract.status.listeners}`);
    expect(body).toContain(`state: ${contract.status.state}`);
  });

  it("currentsong serves fixture artist metadata", async () => {
    const contract = await loadContract();
    const response = await fetch(`${BASE}/mpd.cgi?cmd=currentsong`);
    const body = await response.text();

    expect(body).toContain(contract.currentsong.Artist);
  });
});
