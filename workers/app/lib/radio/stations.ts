import type { RadioConfig } from "./types";

export const IRIE_FM_STREAM_URL = "https://stream.iriefm.net:8006/stream";

export type RadioStation =
  | {
      id: "mpd";
      label: string;
      kind: "mpd";
    }
  | {
      id: "irie-fm";
      label: string;
      kind: "external";
      streamUrl: string;
    };

export type ConfiguredRadioStation = RadioStation & {
  streamUrl: string;
};

export const RADIO_STATIONS = [
  { id: "mpd", label: "mpd radio", kind: "mpd" },
  {
    id: "irie-fm",
    label: "IRIE FM 107.5 MHz",
    kind: "external",
    streamUrl: IRIE_FM_STREAM_URL,
  },
] as const satisfies readonly RadioStation[];

export const DEFAULT_STATION_ID = "mpd" as const;

export type RadioStationId = (typeof RADIO_STATIONS)[number]["id"];

export function createRadioConfig(
  mpdHost: string,
  titleFallback: string,
): RadioConfig {
  const stations = RADIO_STATIONS.map((station) =>
    station.kind === "mpd"
      ? { ...station, streamUrl: `https://${mpdHost}/` }
      : station,
  );

  return { stations, defaultStationId: DEFAULT_STATION_ID, titleFallback };
}
