import { Result } from "better-result";
import { env } from "cloudflare:workers";

import type { MpdPingErr } from "../../schemas/mpd";
import { mpcAccessFromEnv, mpcBridgeFetchInit } from "./bridge";
import { resolveMpcBridgeOrigin } from "./bridge-url";
import { verifyMpcBridgePingResponse } from "./mpc-bridge-ping-response";

export const TUNNEL_HTTP_HINT =
  "Tunnel Public Hostname を Type=HTTP + http://mpc-bridge:8080。tcp://6600 は Worker 非対応";

export function resolveMpcBaseUrl(): string {
  return resolveMpcBridgeOrigin(env.MPC_HOST, env.MPC_BRIDGE_BASE_URL);
}

export function createMpdPingError(
  bridgeUrl: string,
  error: string,
  hint = TUNNEL_HTTP_HINT,
): MpdPingErr {
  return { ok: false, target: bridgeUrl, error, hint };
}

/** mpc-bridge JSON ping（mpdCommand とは別経路） */
export async function mpcBridgePing(): Promise<Result<void, MpdPingErr>> {
  const bridgeUrl = resolveMpcBaseUrl();

  return Result.tryPromise({
    try: async () => {
      const pingResponse = await fetch(
        `${bridgeUrl}/mpd.cgi?cmd=ping`,
        mpcBridgeFetchInit(mpcAccessFromEnv(env)),
      );

      await verifyMpcBridgePingResponse(pingResponse);
    },
    catch: (cause) =>
      createMpdPingError(bridgeUrl, cause instanceof Error ? cause.message : String(cause)),
  });
}
