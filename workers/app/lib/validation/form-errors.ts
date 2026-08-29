import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as v from "valibot";

/** Standard Schema issue path segment（Valibot は `{ key: string }` を emit） */
export type StandardPathSegment =
  | { readonly key: string }
  | string
  | number;

const pathSegmentSchema = v.union([
  v.string(),
  v.number(),
  v.object({ key: v.string() }),
]);

/** Inertia フォーム用フィールドエラー（テンプレート） */
export type FieldErrors<T extends object> = Partial<
  Record<keyof T & string, string>
>;

/** 空のフィールドエラー。`errors: {}` の代わりに使い、型推論を安定させる */
export function emptyFormErrors<T extends object>(): FieldErrors<T> {
  return {} satisfies FieldErrors<T>;
}

/** Standard Schema issues → フィールドエラーへ集約 */
export function toFieldErrorsFromIssues<T extends object>(
  issues: readonly StandardSchemaV1.Issue[],
  resolveKey: (
    pathTail: StandardPathSegment | undefined,
  ) => keyof T & string | null,
) {
  const out: Partial<Record<keyof T & string, string>> = {};
  for (const issue of issues) {
    const raw = issue.path?.[issue.path.length - 1];
    const segment = v.safeParse(pathSegmentSchema, raw);
    const key = resolveKey(segment.success ? segment.output : undefined);
    if (!key || key in out) continue;
    out[key] = issue.message;
  }
  return out satisfies FieldErrors<T>;
}
