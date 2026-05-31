import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { PostFormErrors, PostSongInput } from "../schemas/posts";

const pathToField = (
  path: StandardSchemaV1.Issue["path"],
): string | undefined => {
  if (!path?.length) return undefined;
  const last = path[path.length - 1];
  if (typeof last === "object" && last !== null && "key" in last) {
    return String(last.key);
  }
  if (typeof last === "string" || typeof last === "number") {
    return String(last);
  }
  return undefined;
};

export const toFieldErrors = (
  issues: readonly StandardSchemaV1.Issue[],
): PostFormErrors => {
  const out: PostFormErrors = {};
  for (const issue of issues) {
    const key = pathToField(issue.path);
    if (!key || key in out) continue;
    out[key as keyof PostSongInput] = issue.message;
  }
  return out;
};

export const recoverInput = (data: unknown): PostSongInput => {
  const obj = (data ?? {}) as Partial<PostSongInput>;
  return {
    file: typeof obj.file === "string" ? obj.file : "",
  };
};
