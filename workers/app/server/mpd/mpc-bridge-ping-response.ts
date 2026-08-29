import { boolean, object, optional, safeParse } from "valibot";

/** mpc-bridge `mpd.cgi?cmd=ping` の HTTP 応答を検証（cloudflare 非依存） */
export async function verifyMpcBridgePingResponse(
  pingRes: Response,
): Promise<void> {
  if (!pingRes.ok) {
    throw new Error(`mpc-bridge ping HTTP ${pingRes.status}`);
  }
  const ping = safeParse(
    object({ ok: optional(boolean()) }),
    await pingRes.json(),
  );
  if (!ping.success || !ping.output.ok) {
    throw new Error("mpd.cgi ping failed");
  }
}
