import { Result } from "better-result";

import {
  MpcHttpError,
  MpdAckError,
  MpdInvalidResponseError,
  mpdErrorFromUnknown,
  type MpdError,
} from "../../lib/radio/errors";

export const MPD_TIMEOUT_MS = 8_000;

export type MpcAccessCredentials = {
  clientId: string;
  clientSecret: string;
};

export function mpcAccessFromEnv(env: {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}): MpcAccessCredentials | undefined {
  const { CF_ACCESS_CLIENT_ID: clientId, CF_ACCESS_CLIENT_SECRET: clientSecret } =
    env;
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

function mpcUrl(mpcHost: string, cmd: string): string {
  return `https://${mpcHost}/mpd.cgi?cmd=${encodeURIComponent(cmd)}`;
}

function isValidMpdBody(raw: string): boolean {
  if (raw.length === 0) return true;
  return (
    /^OK MPD /m.test(raw) ||
    /[\r\n]OK[\r\n]/m.test(raw) ||
    /^ACK /m.test(raw)
  );
}

/** Tunnel HTTP 経由で MPD コマンド実行（mpc-bridge 接続プール利用） */
export async function mpdBridgeCommand(
  mpcHost: string,
  cmd: string,
  access?: MpcAccessCredentials,
): Promise<Result<string, MpdError>> {
  const url = mpcUrl(mpcHost, cmd);
  return Result.tryPromise({
    try: async () => {
      const res = await fetch(url, mpcBridgeFetchInit(access));
      if (!res.ok) {
        throw new MpcHttpError({ status: res.status, url });
      }
      const raw = await res.text();
      if (raw.includes("HTTP/1.")) {
        throw new MpdInvalidResponseError({
          url,
          preview:
            "HTTP response (tunnel should be http://mpc-bridge:8080, not tcp://mpd:6600)",
        });
      }
      if (!isValidMpdBody(raw)) {
        throw new MpdInvalidResponseError({ url, preview: raw.slice(0, 120) });
      }
      if (raw.includes("ACK")) {
        throw new MpdAckError({ cmd, preview: raw.slice(0, 200) });
      }
      return raw;
    },
    catch: mpdErrorFromUnknown,
  });
}
