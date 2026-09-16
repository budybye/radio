import { describe, expect, it } from "vitest";

import {
  canApplyPlaybackResult,
  getMediaErrorMode,
  getStationPlaybackTransition,
} from "./use-radio-player";

describe("station playback transition", () => {
  it("reconnects to a selected external source when playback is active", () => {
    expect(
      getStationPlaybackTransition(
        {
          id: "irie-fm",
          label: "IRIE FM 107.5 MHz",
          kind: "external",
          streamUrl: "https://stream.iriefm.net:8006/stream",
          broadcastLocation: { label: "Ocho Rios, Jamaica", coordinates: [18.4074, -77.1031] },
        },
        true,
      ),
    ).toEqual({
      streamUrl: "https://stream.iriefm.net:8006/stream",
      shouldReconnect: true,
      isMpdStation: false,
      shouldEngageAgent: false,
      shouldClearMpdState: true,
    });
  });

  it("selects a source without autoplay when playback is stopped", () => {
    expect(
      getStationPlaybackTransition(
        {
          id: "mpd",
          label: "044g Radio",
          kind: "mpd",
          streamUrl: "https://mpd.example.test/",
          broadcastLocation: { label: "Tokyo, Japan", coordinates: [35.6762, 139.6503] },
        },
        false,
      ),
    ).toEqual({
      streamUrl: "https://mpd.example.test/",
      shouldReconnect: false,
      isMpdStation: true,
      shouldEngageAgent: false,
      shouldClearMpdState: false,
    });
  });
});

describe("station media errors", () => {
  it("marks external sources unavailable instead of reconnecting through MPD", () => {
    expect(
      getMediaErrorMode({
        id: "irie-fm",
        label: "IRIE FM 107.5 MHz",
        kind: "external",
        streamUrl: "https://stream.iriefm.net:8006/stream",
        broadcastLocation: { label: "Ocho Rios, Jamaica", coordinates: [18.4074, -77.1031] },
      }),
    ).toBe("unavailable");
    expect(
      getMediaErrorMode({
        id: "mpd",
        label: "044g Radio",
        kind: "mpd",
        streamUrl: "https://mpd.example.test/",
        broadcastLocation: { label: "Tokyo, Japan", coordinates: [35.6762, 139.6503] },
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
