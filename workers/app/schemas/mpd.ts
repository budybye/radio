import {
  object,
  optional,
  pipe,
  string,
  minLength,
  maxLength,
  type InferInput,
} from "valibot";

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
export const mpdSongRecordSchema = object({
  file: pipe(string(), minLength(1)),
  Title: optional(string()),
  Artist: optional(string()),
  Album: optional(string()),
  Id: optional(string()),
  Pos: optional(string()),
  Time: optional(string()),
});
