import {
  object,
  optional,
  safeParse,
  string,
  type InferOutput,
} from "valibot";

/** OK/ACK 行を除いた MPD レスポンス行 */
function mpdLines(raw: string): string[] {
  return raw
    .split("\n")
    .filter((line) => !line.startsWith("OK") && !line.startsWith("ACK"));
}

/** MPD `key: value` 行をフィールドマップへ */
export function mpdFields(raw: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of mpdLines(raw)) {
    const idx = line.indexOf(": ");
    if (idx > 0) fields.set(line.slice(0, idx), line.slice(idx + 2));
  }
  return fields;
}

/** status コマンド応答の既知キー（未知キーは捨てる） */
export const mpdStatusSchema = object({
  songid: optional(string()),
  state: optional(string()),
  listeners: optional(string()),
});
export type MpdStatus = InferOutput<typeof mpdStatusSchema>;

/** MPD status `listeners` を非負整数へ（欠損・不正は 0） */
export function parseListenerCount(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export type ParsedMpdStatus = {
  status: MpdStatus;
  listenerCount: number;
  /** 応答フィールド数（/mpd/ping の診断値） */
  fieldCount: number;
};

export function parseMpdStatus(raw: string): ParsedMpdStatus {
  const fields = mpdFields(raw);
  const parsed = safeParse(mpdStatusSchema, Object.fromEntries(fields));
  const status = parsed.success ? parsed.output : {};
  return {
    status,
    listenerCount: parseListenerCount(status.listeners),
    fieldCount: fields.size,
  };
}

/** currentsong / addid 系レコードの生フィールド。スキーマ解析は呼び出し側（song.ts など） */
export function parseMpdRecord(raw: string) {
  return Object.fromEntries(mpdFields(raw));
}

export function parseMpdRecords(raw: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of mpdLines(raw)) {
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
