import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { TITLE_FALLBACK } from "../lib/radio/constants";
import { createAppShell } from "./middleware";
import { fetchCurrentSongResult } from "./mpd/current-song";
import { fetchListenerCountResult } from "./mpd/listener-count";
import { apiPosts, createApiPostsRoutes } from "./api/posts";
import { createMpdRoutes, mpd } from "./mpd/routes";
import { mountOpenApi } from "./openapi/mount";
import { posts } from "./posts-routes";

function createApp() {
  const documentedApi = new Hono<Env>()
    .route("/", createMpdRoutes())
    .route("/api/posts", createApiPostsRoutes());

  return mountOpenApi(
    createAppShell()
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
          config: {
            streamUrl: `https://${env.MPD_HOST}/`,
            titleFallback: TITLE_FALLBACK,
          },
        });
      })
      .route("/", mpd)
      .route("/api/posts", apiPosts)
      .route("/posts", posts),
    documentedApi,
  );
}

const routes = createApp();

export default routes;
export type AppType = ReturnType<typeof createApp>;
