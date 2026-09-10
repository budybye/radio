import { env } from "cloudflare:workers";
import { ImageResponse, cache } from "@cf-wasm/og/workerd";
import { createRadioConfig } from "../lib/radio/stations";
import { TITLE_FALLBACK } from "../lib/radio/constants";
import { createAppShell } from "./middleware";
import { fetchCurrentSongResult } from "./mpd/current-song";
import { fetchListenerCountResult } from "./mpd/listener-count";
import { apiPosts } from "./api/posts";
import { mpd } from "./mpd/routes";
import { mountOpenApi } from "./openapi/mount";
import { posts } from "./posts-routes";

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
            <div style={{ fontSize: 92, fontWeight: 800, marginTop: 22 }}>
              mpd radio
            </div>
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
      const [songResult, listenerResult] = await Promise.all([
        fetchCurrentSongResult(),
        fetchListenerCountResult(),
      ]);
      const song = songResult.match({
        ok: (value) => value,
        err: () => undefined,
      });
      const listenerCount = listenerResult.match({
        ok: (value) => value,
        err: () => 0,
      });
      return c.render("Home", {
        song,
        listenerCount,
        config: createRadioConfig(env.MPD_HOST, TITLE_FALLBACK),
      });
    })
    .route("/", mpd)
    .route("/api/posts", apiPosts)
    .route("/posts", posts),
);
export default routes;
export type AppType = typeof routes;

