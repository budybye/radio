import { Result } from "better-result";

import {
  MpdInvalidArgumentError,
  type MpdError,
} from "../../lib/radio/errors";
import { hasAsciiControlChar } from "../../lib/text/control-chars";

export function quoteMpdArg(value: string): Result<string, MpdError> {
  if (hasAsciiControlChar(value)) {
    return Result.err(new MpdInvalidArgumentError({ field: "argument" }));
  }
  return Result.ok(
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
}
