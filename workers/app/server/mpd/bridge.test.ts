import { describe, expect, it } from "vite-plus/test";

import { resolveMpcBridgeOrigin, buildMpcBridgeUrl } from "./bridge-url";

describe("buildMpcBridgeUrl", () => {
  it("uses https + MPC_HOST in production mode", () => {
    expect(buildMpcBridgeUrl("mpc.example.com", "status")).toBe(
      "https://mpc.example.com/mpd.cgi?cmd=status",
    );
  });

  it("encodes command query values", () => {
    expect(buildMpcBridgeUrl("mpc.example", 'play "1"')).toBe(
      "https://mpc.example/mpd.cgi?cmd=play%20%221%22",
    );
  });

  it("uses MPC_BRIDGE_BASE_URL for local e2e dummy", () => {
    expect(buildMpcBridgeUrl("ignored-host", "currentsong", "http://127.0.0.1:18080")).toBe(
      "http://127.0.0.1:18080/mpd.cgi?cmd=currentsong",
    );
  });

  it("normalizes trailing slash on base URL", () => {
    expect(resolveMpcBridgeOrigin("ignored", "http://127.0.0.1:18080/")).toBe(
      "http://127.0.0.1:18080",
    );
  });

  it("falls back to MPC_HOST when override is not an absolute URL", () => {
    expect(resolveMpcBridgeOrigin("mpc.example.com", "localhost")).toBe("https://mpc.example.com");
  });
});
