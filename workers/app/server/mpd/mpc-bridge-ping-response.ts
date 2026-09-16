import { boolean, object, optional, safeParse } from "valibot";

/** mpc-bridge `mpd.cgi?cmd=ping` の HTTP 応答を検証（cloudflare 非依存） */
export async function verifyMpcBridgePingResponse(pingResponse: Response): Promise<void> {
  if (!pingResponse.ok) {
    throw new Error(`mpc-bridge ping HTTP ${pingResponse.status}`);
  }

  const pingPayload = safeParse(object({ ok: optional(boolean()) }), await pingResponse.json());

  if (!pingPayload.success || !pingPayload.output.ok) {
    throw new Error("mpd.cgi ping failed");
  }
}
