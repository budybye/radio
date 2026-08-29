import { describe, expect, it } from "vitest";

import { MpdInvalidArgumentError } from "../../lib/radio/errors";
import { quoteMpdArg } from "./quote-mpd-arg";

describe("quoteMpdArg", () => {
  it("quotes safe values", () => {
    const result = quoteMpdArg('track "1".mp3');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe('"track \\"1\\".mp3"');
    }
  });

  it("rejects control characters without throwing", () => {
    const result = quoteMpdArg("bad\x00path");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(MpdInvalidArgumentError.is(result.error)).toBe(true);
    }
  });
});
