import { describe, expect, it } from "vitest";

import { mpcBridgeOrigin, mpcBridgeUrl } from "./bridge-url";

describe("mpcBridgeUrl", () => {
  it("uses https + MPC_HOST in production mode", () => {
    expect(mpcBridgeUrl("mpc.example.com", "status")).toBe(
      "https://mpc.example.com/mpd.cgi?cmd=status",
    );
  });

  it("encodes command query values", () => {
    expect(mpcBridgeUrl("mpc.example", 'play "1"')).toBe(
      'https://mpc.example/mpd.cgi?cmd=play%20%221%22',
    );
  });

  it("uses MPC_BRIDGE_BASE_URL for local e2e dummy", () => {
    expect(
      mpcBridgeUrl("ignored-host", "currentsong", "http://127.0.0.1:18080"),
    ).toBe("http://127.0.0.1:18080/mpd.cgi?cmd=currentsong");
  });

  it("normalizes trailing slash on base URL", () => {
    expect(mpcBridgeOrigin("ignored", "http://127.0.0.1:18080/")).toBe(
      "http://127.0.0.1:18080",
    );
  });

  it("falls back to MPC_HOST when override is not an absolute URL", () => {
    expect(mpcBridgeOrigin("mpc.example.com", "localhost")).toBe(
      "https://mpc.example.com",
    );
  });
});
