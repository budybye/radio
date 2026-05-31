import { env } from "cloudflare:workers";
import { Result } from "better-result";

import type { MpdError } from "../../lib/radio/errors";
import { mpcAccessFromEnv, mpdBridgeCommand } from "./bridge";

/** Tunnel HTTP 経由で MPD コマンド実行（Public Hostname TCP は Worker connect 非対応） */
export async function mpdCommand(
  cmd: string,
): Promise<Result<string, MpdError>> {
  return mpdBridgeCommand(env.MPC_HOST, cmd, mpcAccessFromEnv(env));
}

export function quoteMpdArg(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
