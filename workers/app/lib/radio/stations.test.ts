import { describe, expect, it } from "vitest";

import {
  createRadioConfig,
  DEFAULT_STATION_ID,
  IRIE_FM_STREAM_URL,
  RADIO_STATIONS,
} from "./stations";

describe("radio station catalog", () => {
  it("contains the MPD default and IRIE FM sources", () => {
    expect(DEFAULT_STATION_ID).toBe("mpd");
    expect(RADIO_STATIONS).toEqual([
      {
        id: "mpd",
        label: "mpd radio",
        kind: "mpd",
      },
      {
        id: "irie-fm",
        label: "IRIE FM 107.5 MHz",
        kind: "external",
        streamUrl: IRIE_FM_STREAM_URL,
      },
    ]);
    expect(IRIE_FM_STREAM_URL).toBe("https://stream.iriefm.net:8006/stream");
  });

  it("builds Home config with the runtime MPD URL", () => {
    expect(createRadioConfig("mpd.example.test", "mpd radio")).toEqual({
      stations: [
        {
          id: "mpd",
          label: "mpd radio",
          kind: "mpd",
          streamUrl: "https://mpd.example.test/",
        },
        {
          id: "irie-fm",
          label: "IRIE FM 107.5 MHz",
          kind: "external",
          streamUrl: IRIE_FM_STREAM_URL,
        },
      ],
      defaultStationId: DEFAULT_STATION_ID,
      titleFallback: "mpd radio",
    });
  });
});
