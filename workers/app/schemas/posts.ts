import {
  check,
  object,
  pipe,
  string,
  minLength,
  maxLength,
  type InferInput,
} from "valibot";

import { hasAsciiControlChar } from "../lib/text/control-chars";

/** Posts 管理 UI — MPD `add` コマンド入力 */
export const postSongInputSchema = object({
  file: pipe(
    string(),
    minLength(1, "ファイルパスは必須です"),
    maxLength(500, "ファイルパスは500文字以内で入力してください"),
    check(
      (input) => !hasAsciiControlChar(input),
      "ファイルパスに制御文字を含められません",
    ),
  ),
});

export type PostSongInput = InferInput<typeof postSongInputSchema>;

export type PostFormErrors = Partial<Record<keyof PostSongInput, string>>;
