import { Result } from "better-result";
import { env } from "cloudflare:workers";
import { boolean, object, optional, safeParse } from "valibot";

import type { MpdPingErr } from "../../schemas/mpd";
import {
  mpcAccessFromEnv,
  mpcBridgeFetchInit,
} from "./bridge";
import { mpcBridgeOrigin } from "./bridge-url";

export const TUNNEL_HTTP_HINT =
  "Tunnel Public Hostname を Type=HTTP + http://mpc-bridge:8080。tcp://6600 は Worker 非対応";

export function mpcBaseUrl(): string {
  return mpcBridgeOrigin(env.MPC_HOST, env.MPC_BRIDGE_BASE_URL);
}

export function mpdPingErr(
  target: string,
  error: string,
  hint = TUNNEL_HTTP_HINT,
): MpdPingErr {
  return { ok: false, target, error, hint };
}

/** mpc-bridge JSON ping（mpdCommand とは別経路） */
export async function mpcBridgePing(): Promise<Result<void, MpdPingErr>> {
  const target = mpcBaseUrl();
  return Result.tryPromise({
    try: async () => {
      const pingRes = await fetch(
        `${target}/mpd.cgi?cmd=ping`,
        mpcBridgeFetchInit(mpcAccessFromEnv(env)),
      );
      const ping = safeParse(
        object({ ok: optional(boolean()) }),
        await pingRes.json(),
      );
      if (!ping.success || !ping.output.ok) {
        throw new Error("mpd.cgi ping failed");
      }
    },
    catch: (e) =>
      mpdPingErr(target, e instanceof Error ? e.message : String(e)),
  });
}
