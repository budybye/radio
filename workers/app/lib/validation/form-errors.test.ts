import { describe, expect, it } from "vitest";
import * as v from "valibot";

import {
  emptyFormErrors,
  type StandardPathSegment,
  toFieldErrorsFromIssues,
} from "./form-errors";

type SampleInput = { file: string; note?: string };

const sampleFileKeySchema = v.object({ key: v.literal("file") });

function resolveSampleKey(
  last: StandardPathSegment | undefined,
): keyof SampleInput | null {
  if (last === undefined) return null;
  if (last === "file") return "file";
  if (v.safeParse(sampleFileKeySchema, last).success) return "file";
  return null;
}

describe("form-errors", () => {
  it("emptyFormErrors preserves field keys in the type", () => {
    const errors = emptyFormErrors<SampleInput>();
    expect(errors).toEqual({});
    const _file: string | undefined = errors.file;
    void _file;
  });

  it("toFieldErrorsFromIssues maps the first issue per field", () => {
    const errors = toFieldErrorsFromIssues<SampleInput>(
      [
        { message: "required", path: [{ key: "file" }] },
        { message: "ignored duplicate", path: [{ key: "file" }] },
      ],
      resolveSampleKey,
    );
    expect(errors).toEqual({ file: "required" });
  });
});
