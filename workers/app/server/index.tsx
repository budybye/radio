import { env } from "cloudflare:workers";
import { ImageResponse, cache } from "@cf-wasm/og/workerd";
import { RADIO_STATIONS, DEFAULT_STATION_ID } from "../lib/radio/stations";
import { TITLE_FALLBACK } from "../lib/radio/constants";
import { createAppShell } from "./middleware";
import { getCachedCurrentSongForSsr } from "./mpd/current-song";
import { getCachedListenerCountForSsr } from "./mpd/listener-count";
import { apiQueue } from "./api/queue";
import { mpd } from "./mpd/routes";
import { mountOpenApi } from "./openapi/mount";
import { queue } from "./queue-routes";

const routes = mountOpenApi(
  createAppShell()
    .get("/og.png", (c) => {
      cache.setExecutionContext(c.executionCtx);

      return ImageResponse.async(
        <div
          style={{
            backgroundColor: "#111827",
            color: "#f9fafb",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "72px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#fbbf24",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Live internet radio
            </div>
            <div style={{ fontSize: 92, fontWeight: 800, marginTop: 22 }}>mpd radio</div>
          </div>
          <div
            style={{
              color: "#d1d5db",
              fontSize: 34,
              fontWeight: 500,
            }}
          >
            Live audio from mpd radio
          </div>
        </div>,
        {
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
          height: 630,
          width: 1200,
        },
      );
    })
    .get("/", async (c) => {
      const [currentSongResult, listenerCountResult] = await Promise.all([
        getCachedCurrentSongForSsr(),
        getCachedListenerCountForSsr(),
      ]);

      const currentSong = currentSongResult.match({
        ok: (currentSongPayload) => currentSongPayload,
        err: () => undefined,
      });

      const listenerCount = listenerCountResult.match({
        ok: (resolvedListenerCount) => resolvedListenerCount,
        err: () => 0,
      });

      const response = await c.render("Home", {
        initialCurrentSong: currentSong,
        listenerCount,
        config: {
          stations: RADIO_STATIONS.map((station) =>
            station.kind === "mpd"
              ? { ...station, streamUrl: `https://${env.MPD_HOST}/` }
              : station,
          ),
          defaultStationId: DEFAULT_STATION_ID,
          titleFallback: TITLE_FALLBACK,
        },
      });

      response.headers.set("Cache-Control", "public, max-age=0, must-revalidate, no-transform");

      return response;
    })
    .route("/", mpd)
    .route("/api/queue", apiQueue)
    .route("/queue", queue),
);

export default routes;

export type AppType = typeof routes;
