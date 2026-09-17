import { describe, expect, it } from "vite-plus/test";

import { isHlsStreamUrl } from "./stream-playback";

describe("isHlsStreamUrl", () => {
  it("detects BBC-style akamai HLS playlists", () => {
    expect(
      isHlsStreamUrl(
        "https://as-hls-ww-live.akamaized.net/pool_92079267/live/ww/bbc_1xtra/bbc_1xtra.isml/bbc_1xtra-audio%3d96000.norewind.m3u8",
      ),
    ).toBe(true);
  });

  it("returns false for progressive mp3 streams", () => {
    expect(
      isHlsStreamUrl(
        "https://playerservices.streamtheworld.com/api/livestream-redirect/WQHTFM.mp3",
      ),
    ).toBe(false);
  });
});
