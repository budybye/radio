import { object, optional, safeParse, string, type InferOutput } from "valibot";

/** OK/ACK 行を除いた MPD レスポンス行 */
function mpdLines(rawResponse: string): string[] {
  return rawResponse
    .split("\n")
    .filter((line) => !line.startsWith("OK") && !line.startsWith("ACK"));
}

/** MPD `key: value` 行をフィールドマップへ */
export function parseMpdFields(rawResponse: string): Map<string, string> {
  const fields = new Map<string, string>();

  for (const line of mpdLines(rawResponse)) {
    const separatorIndex = line.indexOf(": ");

    if (separatorIndex > 0) {
      fields.set(line.slice(0, separatorIndex), line.slice(separatorIndex + 2));
    }
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
export function parseListenerCount(listenerValue: string | undefined): number {
  if (!listenerValue) return 0;
  const parsedListenerCount = Number.parseInt(listenerValue, 10);

  if (!Number.isFinite(parsedListenerCount) || parsedListenerCount < 0) return 0;

  return parsedListenerCount;
}

export type ParsedMpdStatus = {
  status: MpdStatus;
  listenerCount: number;
  /** 応答フィールド数（/mpd/ping の診断値） */
  fieldCount: number;
};

export function parseMpdStatus(rawResponse: string): ParsedMpdStatus {
  const fields = parseMpdFields(rawResponse);
  const statusValidation = safeParse(mpdStatusSchema, Object.fromEntries(fields));
  const validatedStatus = statusValidation.success ? statusValidation.output : {};

  return {
    status: validatedStatus,
    listenerCount: parseListenerCount(validatedStatus.listeners),
    fieldCount: fields.size,
  };
}

/** currentsong / addid 系レコードの生フィールド。スキーマ解析は呼び出し側（song.ts など） */
export function parseMpdRecord(rawResponse: string) {
  return Object.fromEntries(parseMpdFields(rawResponse));
}

export function parseMpdRecords(rawResponse: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  let currentRecord: Record<string, string> | null = null;

  for (const line of mpdLines(rawResponse)) {
    if (line === "") continue;
    const separatorIndex = line.indexOf(": ");

    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 2);

    if (key === "file") {
      if (currentRecord) records.push(currentRecord);
      currentRecord = { file: value };
      continue;
    }

    if (currentRecord) currentRecord[key] = value;
  }

  if (currentRecord) records.push(currentRecord);

  return records;
}
