import { describe, expect, it } from "vitest";

import { verifyMpcBridgePingResponse } from "./mpc-bridge-ping-response";

describe("verifyMpcBridgePingResponse", () => {
  it("rejects HTTP error responses before parsing JSON", async () => {
    await expect(
      verifyMpcBridgePingResponse(
        new Response("upstream down", { status: 502 }),
      ),
    ).rejects.toThrow("502");
  });

  it("accepts ok:true JSON from mpc-bridge ping", async () => {
    await expect(
      verifyMpcBridgePingResponse(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      ),
    ).resolves.toBeUndefined();
  });
});
