import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { TITLE_FALLBACK } from "../lib/radio/constants";
import { createAppShell } from "./middleware";
import { fetchCurrentSong } from "./mpd/current-song";
import { fetchListenerCount } from "./mpd/listener-count";
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
        const [song, listenerCount] = await Promise.all([
          fetchCurrentSong(),
          fetchListenerCount(),
        ]);
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
