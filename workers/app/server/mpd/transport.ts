import { Result } from "better-result";
import { env } from "cloudflare:workers";

import type { MpdError } from "../../lib/radio/errors";
import { mpdBridgeCommand } from "./bridge";

export const MPD_TIMEOUT_MS = 8_000;

const TUNNEL_HTTP_HINT =
  "Tunnel Public Hostname を Type=HTTP + http://mpc-bridge:8080。tcp://6600 は Worker 非対応";

export type MpdPingOk = {
  ok: true;
  target: string;
  via: string;
  state: string | null;
  fields: number;
};

export type MpdPingErr = {
  ok: false;
  target: string;
  error: string;
  hint: string;
};

export function mpcBaseUrl(): string {
  return `https://${env.MPC_HOST}`;
}

function mpdPingErr(
  target: string,
  error: string,
  hint = TUNNEL_HTTP_HINT,
): MpdPingErr {
  return { ok: false, target, error, hint };
}

/** mpc-bridge JSON ping（mpdCommand とは別経路） */
export async function mpcBridgePing(): Promise<
  Result<void, MpdPingErr>
> {
  const target = mpcBaseUrl();
  try {
    const pingRes = await fetch(`${target}/mpd.cgi?cmd=ping`, {
      signal: AbortSignal.timeout(MPD_TIMEOUT_MS),
      cache: "no-store",
    });
    const ping = (await pingRes.json()) as { ok?: boolean };
    if (!ping.ok) {
      return Result.err(mpdPingErr(target, "mpd.cgi ping failed"));
    }
    return Result.ok(undefined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Result.err(mpdPingErr(target, msg));
  }
}

/** Tunnel HTTP 経由で MPD コマンド実行（Public Hostname TCP は Worker connect 非対応） */
export async function mpdCommand(
  cmd: string,
): Promise<Result<string, MpdError>> {
  return mpdBridgeCommand(env.MPC_HOST, cmd);
}

export function quoteMpdArg(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export { mpdPingErr, TUNNEL_HTTP_HINT };
