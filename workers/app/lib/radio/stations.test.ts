import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_STATION_ID, RADIO_STATIONS } from "./stations";

describe("radio station catalog", () => {
  it("defaults to the MPD station", () => {
    expect(RADIO_STATIONS.find(({ id }) => id === DEFAULT_STATION_ID)?.kind).toBe("mpd");
  });

  it("keeps station ids unique", () => {
    expect(new Set(RADIO_STATIONS.map(({ id }) => id)).size).toBe(RADIO_STATIONS.length);
  });

  it("serves the named external stations over https", () => {
    for (const id of ["irie-fm", "zip-103", "fame-95", "hot-97", "reprezent", "bbc-1xtra"]) {
      const station = RADIO_STATIONS.find((entry) => entry.id === id);

      if (station?.kind !== "external") throw new Error(`Missing external station: ${id}`);
      expect(new URL(station.streamUrl).protocol).toBe("https:");
    }
  });
});
