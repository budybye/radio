import { describe, expect, it } from "vitest";

import {
  canApplyPlaybackResult,
  mediaErrorMode,
  stationPlaybackTransition,
} from "./use-radio-player";

describe("station playback transition", () => {
  it("reconnects to a selected external source when playback is active", () => {
    expect(
      stationPlaybackTransition(
        {
          id: "irie-fm",
          label: "IRIE FM 107.5 MHz",
          kind: "external",
          streamUrl: "https://stream.iriefm.net:8006/stream",
        },
        true,
      ),
    ).toEqual({
      streamUrl: "https://stream.iriefm.net:8006/stream",
      reconnect: true,
      mpdState: false,
      engageAgent: false,
      clearMpdState: true,
    });
  });

  it("selects a source without autoplay when playback is stopped", () => {
    expect(
      stationPlaybackTransition(
        {
          id: "mpd",
          label: "mpd radio",
          kind: "mpd",
          streamUrl: "https://mpd.example.test/",
        },
        false,
      ),
    ).toEqual({
      streamUrl: "https://mpd.example.test/",
      reconnect: false,
      mpdState: true,
      engageAgent: false,
      clearMpdState: false,
    });
  });
});

describe("station media errors", () => {
  it("marks external sources unavailable instead of reconnecting through MPD", () => {
    expect(
      mediaErrorMode({
        id: "irie-fm",
        label: "IRIE FM 107.5 MHz",
        kind: "external",
        streamUrl: "https://stream.iriefm.net:8006/stream",
      }),
    ).toBe("unavailable");
    expect(
      mediaErrorMode({
        id: "mpd",
        label: "mpd radio",
        kind: "mpd",
        streamUrl: "https://mpd.example.test/",
      }),
    ).toBe("reconnect");
  });
});

describe("playback generation guard", () => {
  it("rejects stale or stopped playback results", () => {
    expect(canApplyPlaybackResult(1, 2, true)).toBe(false);
    expect(canApplyPlaybackResult(2, 2, false)).toBe(false);
    expect(canApplyPlaybackResult(2, 2, true)).toBe(true);
  });
});
