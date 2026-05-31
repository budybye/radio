import { Result } from "better-result";

import type { MpdError } from "../../lib/radio/errors";
import { parseMpdResponse } from "./parse";
import { mpdCommand } from "./transport";

export async function getStatusResult(): Promise<
  Result<Record<string, string>, MpdError>
> {
  return (await mpdCommand("status")).map(parseMpdResponse);
}
