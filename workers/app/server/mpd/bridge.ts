import { env } from "cloudflare:workers";
import { Result } from "better-result";

import { MPD_TIMEOUT_MS } from "../../lib/radio/constants";
import {
  MpcHttpError,
  MpdAckError,
  MpdInvalidResponseError,
  mpdErrorFromUnknown,
  type MpdError,
} from "../../lib/radio/errors";
import { buildMpcBridgeUrl } from "./bridge-url";

export { quoteMpdArg } from "./quote-mpd-arg";

export { resolveMpcBridgeOrigin, buildMpcBridgeUrl } from "./bridge-url";

export type MpcAccessCredentials = {
  clientId: string;
  clientSecret: string;
};

export function mpcAccessFromEnv(env: {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}): MpcAccessCredentials | undefined {
  const { CF_ACCESS_CLIENT_ID: clientId, CF_ACCESS_CLIENT_SECRET: clientSecret } = env;

  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  return undefined;
}

export function mpcBridgeFetchInit(
  access?: MpcAccessCredentials,
): Pick<RequestInit, "headers" | "signal" | "cache"> {
  const headers: Record<string, string> = {};

  if (access?.clientId && access?.clientSecret) {
    headers["CF-Access-Client-Id"] = access.clientId;
    headers["CF-Access-Client-Secret"] = access.clientSecret;
  }

  return {
    headers,
    signal: AbortSignal.timeout(MPD_TIMEOUT_MS),
    cache: "no-store",
  };
}

function isValidMpdBody(mpdBody: string): boolean {
  if (mpdBody.length === 0) return true;

  return /^OK MPD /m.test(mpdBody) || /[\r\n]OK[\r\n]/m.test(mpdBody) || /^ACK /m.test(mpdBody);
}

/** Tunnel HTTP 経由で MPD コマンド実行（mpc-bridge 接続プール利用） */
export async function mpdBridgeCommand(
  mpcHost: string,
  command: string,
  access?: MpcAccessCredentials,
  baseUrl?: string,
): Promise<Result<string, MpdError>> {
  const url = buildMpcBridgeUrl(mpcHost, command, baseUrl);

  return Result.tryPromise({
    try: async () => {
      const response = await fetch(url, mpcBridgeFetchInit(access));

      if (!response.ok) {
        throw new MpcHttpError({ status: response.status, url });
      }

      const responseBody = await response.text();

      if (responseBody.includes("HTTP/1.")) {
        throw new MpdInvalidResponseError({
          url,
          preview: "HTTP response (tunnel should be http://mpc-bridge:8080, not tcp://mpd:6600)",
        });
      }

      if (!isValidMpdBody(responseBody)) {
        throw new MpdInvalidResponseError({ url, preview: responseBody.slice(0, 120) });
      }

      if (responseBody.includes("ACK")) {
        throw new MpdAckError({ cmd: command, preview: responseBody.slice(0, 200) });
      }

      return responseBody;
    },
    catch: mpdErrorFromUnknown,
  });
}

/** Tunnel HTTP 経由で MPD コマンド実行（Worker env 付き） */
export async function mpdCommand(command: string): Promise<Result<string, MpdError>> {
  return mpdBridgeCommand(env.MPC_HOST, command, mpcAccessFromEnv(env), env.MPC_BRIDGE_BASE_URL);
}
