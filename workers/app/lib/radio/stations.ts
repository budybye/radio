import { BROADCAST_HUB } from "./constants";

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
      id: "irie-fm" | "zip-103" | "fame-95" | "hot-97" | "reprezent" | "bbc-1xtra";
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
    streamUrl: "https://stream.iriefm.net:8006/stream",
    broadcastLocation: { label: "Ocho Rios, Jamaica", coordinates: [18.4074, -77.1031] },
  },
  {
    id: "zip-103",
    label: "ZIP 103 FM",
    kind: "external",
    streamUrl: "https://stream.zeno.fm/c0ytcn43vxquv",
    broadcastLocation: { label: "Kingston, Jamaica", coordinates: [18.0139, -76.7994] },
  },
  {
    id: "fame-95",
    label: "Fame 95 FM",
    kind: "external",
    streamUrl: "https://stream.zeno.fm/d5mn12bchkeuv",
    broadcastLocation: { label: "Kingston, Jamaica", coordinates: [18.0139, -76.7994] },
  },
  {
    id: "hot-97",
    label: "HOT 97 97.1 MHz",
    kind: "external",
    streamUrl: "https://playerservices.streamtheworld.com/api/livestream-redirect/WQHTFM.mp3",
    broadcastLocation: { label: "New York, USA", coordinates: [40.7128, -74.006] },
  },
  {
    id: "reprezent",
    label: "Reprezent 107.3 FM",
    kind: "external",
    streamUrl: "https://reprezent.streammachine.co.uk/stream/reprezent",
    broadcastLocation: { label: "Brixton, London, UK", coordinates: [51.4613, -0.1156] },
  },
  {
    id: "bbc-1xtra",
    label: "BBC Radio 1Xtra",
    kind: "external",
    streamUrl:
      "https://as-hls-ww-live.akamaized.net/pool_92079267/live/ww/bbc_1xtra/bbc_1xtra.isml/bbc_1xtra-audio%3d96000.norewind.m3u8",
    broadcastLocation: { label: "London, UK", coordinates: [51.5185, -0.1441] },
  },
] as const satisfies readonly RadioStation[];

export const DEFAULT_STATION_ID = "mpd" as const;

export type RadioStationId = (typeof RADIO_STATIONS)[number]["id"];
