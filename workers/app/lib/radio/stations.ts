import { BROADCAST_HUB } from "./constants";

export const IRIE_FM_STREAM_URL = "https://stream.iriefm.net:8006/stream";

export const ZIP_103_STREAM_URL = "https://stream.zeno.fm/c0ytcn43vxquv";

export const FAME_95_STREAM_URL = "https://stream.zeno.fm/d5mn12bchkeuv";

export const HOT_97_STREAM_URL =
  "https://playerservices.streamtheworld.com/api/livestream-redirect/WQHTFM.mp3";

export const REPREZENT_STREAM_URL = "https://reprezent.streammachine.co.uk/stream/reprezent";

export type RadioStation = {
  /** Representative broadcast base, not the stream server or current studio. */
  broadcastLocation: {
    label: string;
    coordinates: readonly [number, number];
  };
} & (
  | {
      id: "mpd";
      label: string;
      kind: "mpd";
    }
  | {
      id: "irie-fm" | "zip-103" | "fame-95" | "hot-97" | "reprezent";
      label: string;
      kind: "external";
      streamUrl: string;
    }
);

export type ConfiguredRadioStation = RadioStation & {
  streamUrl: string;
};

export const RADIO_STATIONS = [
  {
    id: "mpd",
    label: "044g Radio",
    kind: "mpd",
    broadcastLocation: { label: "Tokyo, Japan", coordinates: BROADCAST_HUB },
  },
  {
    id: "irie-fm",
    label: "IRIE FM 107.5 MHz",
    kind: "external",
    streamUrl: IRIE_FM_STREAM_URL,
    broadcastLocation: { label: "Ocho Rios, Jamaica", coordinates: [18.4074, -77.1031] },
  },
  {
    id: "zip-103",
    label: "ZIP 103 FM",
    kind: "external",
    streamUrl: ZIP_103_STREAM_URL,
    broadcastLocation: { label: "Kingston, Jamaica", coordinates: [18.0139, -76.7994] },
  },
  {
    id: "fame-95",
    label: "Fame 95 FM",
    kind: "external",
    streamUrl: FAME_95_STREAM_URL,
    broadcastLocation: { label: "Kingston, Jamaica", coordinates: [18.0139, -76.7994] },
  },
  {
    id: "hot-97",
    label: "HOT 97 97.1 MHz",
    kind: "external",
    streamUrl: HOT_97_STREAM_URL,
    broadcastLocation: { label: "New York, USA", coordinates: [40.7128, -74.006] },
  },
  {
    id: "reprezent",
    label: "Reprezent 107.3 FM",
    kind: "external",
    streamUrl: REPREZENT_STREAM_URL,
    broadcastLocation: { label: "Brixton, London, UK", coordinates: [51.4613, -0.1156] },
  },
] as const satisfies readonly RadioStation[];

export const DEFAULT_STATION_ID = "mpd" as const;

export type RadioStationId = (typeof RADIO_STATIONS)[number]["id"];
