import {
  check,
  object,
  optional,
  pipe,
  string,
  minLength,
  transform,
  type InferOutput,
} from "valibot";

/** playlistinfo / playlistid / currentsong の1レコード（MPD フィールド名） */
export const mpdSongRecordSchema = object({
  file: pipe(string(), minLength(1)),
  Title: optional(string()),
  Artist: optional(string()),
  Album: optional(string()),
  Id: optional(string()),
  Pos: optional(string()),
  Time: optional(string()),
});

export function songDisplayTitle(file: string, title?: string): string {
  return title || file.split("/").pop() || file;
}

/** MPD レコード → キュー用 Song（Id/Pos 必須） */
export const mpdSongSchema = pipe(
  mpdSongRecordSchema,
  check((record) => {
    const id = Number(record.Id);
    const pos = Number(record.Pos);
    return Number.isFinite(id) && Number.isFinite(pos);
  }),
  transform((record) => {
    const id = Number(record.Id);
    const pos = Number(record.Pos);
    const time = record.Time ? Number(record.Time) : undefined;
    return {
      id,
      pos,
      file: record.file,
      title: songDisplayTitle(record.file, record.Title),
      artist: record.Artist ?? "",
      album: record.Album ?? "",
      ...(time !== undefined && Number.isFinite(time) ? { time } : {}),
    };
  }),
);

export type Song = InferOutput<typeof mpdSongSchema>;

export type MpdPingOk = {
  ok: true;
  target: string;
  via: string;
  state: string | null;
  fields: number;
};

export type MpdPingErr = {
  ok: false;
  target: string;
  error: string;
  hint: string;
};

export type MpdPingResponse = MpdPingOk | MpdPingErr;
