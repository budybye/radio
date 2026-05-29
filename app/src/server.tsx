import { inertia } from "@hono/inertia";
import { rootView } from "./root-view";
import middleware from "./middleware";
import {
  createSong,
  deleteSong,
  findSong,
  listSongs,
  recoverInput,
  toFieldErrors,
  updateSong,
} from "./posts";
import { fetchCurrentSong, mpd, mpdAddInputSchema } from "./mpd";
import { sValidator } from "@hono/standard-validator";
import { og } from "./og";

const app = middleware;

app.use(inertia({ version: "1", rootView }));

const routes = app
  .get("/", async (c) => {
    let song;
    try {
      song = await fetchCurrentSong();
    } catch (e) {
      console.error("fetchCurrentSong:", e);
      song = undefined;
    }
    return c.render("Home", { song, message: "320kbps" });
  })
  .route("/", mpd)
  .route("/", og)
  .get("/posts", async (c) =>
    c.render("Posts/Index", { posts: await listSongs() }),
  )
  .get("/posts/new", (c) =>
    c.render("Posts/New", {
      values: { file: "" },
      errors: {} as Record<string, string>,
    }),
  )
  .post(
    "/posts",
    sValidator("json", mpdAddInputSchema, (result, c) => {
      if (!result.success) {
        return c.render("Posts/New", {
          values: recoverInput(result.data),
          errors: toFieldErrors(result.error),
        });
      }
    }),
    async (c) => {
      const song = await createSong(c.req.valid("json"));
      return c.redirect(`/posts/${song.id}`, 303);
    },
  )
  .get("/posts/:id{[0-9]+}", async (c) => {
    const id = Number(c.req.param("id"));
    const post = await findSong(id);
    if (!post) return c.notFound();
    return c.render("Posts/Show", { post });
  })
  .get("/posts/:id{[0-9]+}/edit", async (c) => {
    const id = Number(c.req.param("id"));
    const post = await findSong(id);
    if (!post) return c.notFound();
    return c.render("Posts/Edit", {
      post,
      errors: {} as Record<string, string>,
    });
  })
  .patch(
    "/posts/:id{[0-9]+}",
    sValidator("json", mpdAddInputSchema, async (result, c) => {
      if (!result.success) {
        const id = Number(c.req.param("id"));
        const post = await findSong(id);
        if (!post) return c.notFound();
        return c.render("Posts/Edit", {
          post: { ...post, ...recoverInput(result.data) },
          errors: toFieldErrors(result.error),
        });
      }
    }),
    async (c) => {
      const id = Number(c.req.param("id"));
      const post = await updateSong(id, c.req.valid("json"));
      if (!post) return c.notFound();
      return c.redirect(`/posts/${post.id}`, 303);
    },
  )
  .delete("/posts/:id{[0-9]+}", async (c) => {
    const id = Number(c.req.param("id"));
    if (!(await deleteSong(id))) return c.notFound();
    return c.redirect("/posts", 303);
  });

export default routes;
export type AppType = typeof routes;
