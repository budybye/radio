import { inertia } from "@hono/inertia";
import { rootView } from "../inertia";
import middleware from "./middleware";
import { fetchCurrentSong, mpd } from "./mpd";
import { posts } from "./posts-routes";
import { radioConfig } from "./radio-config";
import { og } from "./og";

middleware.use(inertia({ version: "1", rootView }));

const routes = middleware
  .get("/", async (c) => {
    const song = await fetchCurrentSong();
    return c.render("Home", { song, config: radioConfig() });
  })
  .route("/", mpd)
  .route("/", og)
  .route("/posts", posts);

export default routes;
export type AppType = typeof routes;
