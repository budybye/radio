import * as v from "valibot";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  postSongInputSchema,
  type PostFormErrors,
  type PostSongInput,
} from "../schemas/posts";
import {
  emptyFormErrors,
  type StandardPathSegment,
  toFieldErrorsFromIssues,
} from "./validation/form-errors";

type RawPostForm = v.InferInput<typeof postSongInputSchema>;

const postFileKeySchema = v.object({ key: v.literal("file") });

function fieldKey(
  last: StandardPathSegment | undefined,
): keyof PostSongInput | null {
  if (last === undefined) return null;
  if (last === "file") return "file";
  if (v.safeParse(postFileKeySchema, last).success) return "file";
  return null;
}

export const emptyPostFormErrors = emptyFormErrors<PostSongInput>();

export const toFieldErrors = (
  issues: readonly StandardSchemaV1.Issue[],
): PostFormErrors =>
  toFieldErrorsFromIssues<PostSongInput>(issues, fieldKey);

export const recoverInput = (data: RawPostForm): PostSongInput => {
  const file = v.safeParse(v.string(), data.file);
  return { file: file.success ? file.output : "" };
};
