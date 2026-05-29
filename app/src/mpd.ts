import { Hono } from "hono";
import { getContext } from "hono/context-storage";
import {
  object,
  pipe,
  string,
  minLength,
  maxLength,
  optional,
  safeParse,
  type InferInput,
} from "valibot";

const MPD_TIMEOUT_MS = 8_000;

function mpcBaseUrl(): string {
  const { env } = getContext<Env>();
  return `https://${env.MPC_HOST}`;
}

/** Tunnel HTTP 経由で MPD コマンド実行（Public Hostname TCP は Worker connect 非対応） */
export async function mpdCommand(cmd: string): Promise<string> {
  const url = `${mpcBaseUrl()}/mpd.cgi?cmd=${encodeURIComponent(cmd)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(MPD_TIMEOUT_MS),
    cf: { cacheTtl: 0 },
  });
  if (!res.ok) {
    throw new Error(`mpc http ${res.status} from ${url}`);
  }
  const raw = await res.text();
  if (raw.includes("HTTP/1.")) {
    throw new Error(
      `${url} returned HTTP (tunnel service should be http://mpc-bridge:8080, not tcp://mpd:6600)`,
    );
  }
  if (
    raw.length > 0 &&
    !/^OK MPD /m.test(raw) &&
    !/[\r\n]OK[\r\n]/m.test(raw) &&
    !/^ACK /m.test(raw)
  ) {
    throw new Error(`invalid mpd response: ${raw.slice(0, 120)}`);
  }
  return raw;
}

export function parseMpdResponse(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (line.startsWith("OK") || line.startsWith("ACK")) continue;
    const idx = line.indexOf(": ");
    if (idx > 0) result[line.slice(0, idx)] = line.slice(idx + 2);
  }
  return result;
}

export function parseMpdRecords(raw: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("OK") || line.startsWith("ACK")) continue;
    if (line === "") continue;
    const idx = line.indexOf(": ");
    if (idx <= 0) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 2);
    if (key === "file") {
      if (current) records.push(current);
      current = { file: value };
      continue;
    }
    if (current) current[key] = value;
  }
  if (current) records.push(current);
  return records;
}

/** MPD `add` コマンド入力（プロトコル上は file のみ） */
export const mpdAddInputSchema = object({
  file: pipe(
    string(),
    minLength(1, "ファイルパスは必須です"),
    maxLength(500, "ファイルパスは500文字以内で入力してください"),
  ),
});

export type MpdAddInput = InferInput<typeof mpdAddInputSchema>;

/** playlistinfo / playlistid / currentsong の1レコード（MPD フィールド名） */
const mpdSongRecordSchema = object({
  file: pipe(string(), minLength(1)),
  Title: optional(string()),
  Artist: optional(string()),
  Album: optional(string()),
  Id: optional(string()),
  Pos: optional(string()),
  Time: optional(string()),
});

export type Song = {
  id: number;
  pos: number;
  file: string;
  title: string;
  artist: string;
  album: string;
  time?: number;
};

export function recordToSong(record: Record<string, string>): Song | undefined {
  const parsed = safeParse(mpdSongRecordSchema, record);
  if (!parsed.success) return undefined;

  const id = Number(record.Id);
  const pos = Number(record.Pos);
  if (!Number.isFinite(id) || !Number.isFinite(pos)) return undefined;

  const { file, Title, Artist, Album, Time } = parsed.output;
  return {
    id,
    pos,
    file,
    title: Title || file.split("/").pop() || file,
    artist: Artist ?? "",
    album: Album ?? "",
    time: Time ? Number(Time) : undefined,
  };
}

/** `currentsong` 用。Id/Pos が無くてもタイトル表示できる */
export function recordToCurrentSong(
  record: Record<string, string>,
): Pick<Song, "title" | "artist" | "album" | "file"> | undefined {
  const file = record.file;
  if (!file) return undefined;
  return {
    file,
    title: record.Title || file.split("/").pop() || file,
    artist: record.Artist ?? "",
    album: record.Album ?? "",
  };
}

export function quoteMpdArg(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function getStatus() {
  const raw = await mpdCommand("status");
  return parseMpdResponse(raw);
}

export async function fetchCurrentSong(): Promise<
  Pick<Song, "title" | "artist" | "album" | "file"> | undefined
> {
  const raw = await mpdCommand("currentsong");
  if (raw.includes("ACK")) return undefined;
  const record = parseMpdResponse(raw);
  return recordToCurrentSong(record) ?? recordToSong(record);
}

async function getCurrentSong() {
  const raw = await mpdCommand("currentsong");
  return parseMpdResponse(raw);
}

export const mpd = new Hono<Env>()
  .get("/status", async (c) => c.json(await getStatus()))
  .get("/currentsong", async (c) => c.json(await getCurrentSong()))
  .get("/mpd/ping", async (c) => {
    const target = mpcBaseUrl();
    try {
      const pingRes = await fetch(`${target}/mpd.cgi?cmd=ping`, {
        signal: AbortSignal.timeout(MPD_TIMEOUT_MS),
        cf: { cacheTtl: 0 },
      });
      const ping = (await pingRes.json()) as { ok?: boolean };
      if (!ping.ok) {
        return c.json(
          {
            ok: false,
            target,
            error: "mpd.cgi ping failed",
            hint: "Tunnel: mpc.* → http://mpc-bridge:8080（Type=HTTP）。Public Hostname TCP は Worker 非対応",
          },
          502,
        );
      }
      const raw = await mpdCommand("status");
      const parsed = parseMpdResponse(raw);
      return c.json({
        ok: true,
        target,
        via: "fetch (tunnel HTTP)",
        state: parsed.state ?? null,
        fields: Object.keys(parsed).length,
        rawPreview: raw.slice(0, 200),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return c.json(
        {
          ok: false,
          target,
          error: message,
          hint: "Tunnel Public Hostname を Type=HTTP + http://mpc-bridge:8080。tcp://6600 は Worker 非対応",
        },
        502,
      );
    }
  });
