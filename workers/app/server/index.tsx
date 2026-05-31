import { inertia } from "@hono/inertia";
import { newRpcResponse } from "@hono/capnweb";
import { sValidator } from "@hono/standard-validator";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { rootView } from "../inertia";
import { recoverInput, toFieldErrors } from "../lib/validation";
import { mpdAddInputSchema } from "../schemas/mpd";
import middleware from "./middleware";
import {
  createSong,
  deleteSong,
  findSong,
  listSongs,
  updateSong,
} from "./posts";
import { fetchCurrentSong, mpd } from "./mpd";
import { radioConfig } from "./radio-config";
import { RadioApiServer } from "./rpc";
import { og } from "./og";
import type { Context } from "hono";

const postId = (c: Context) => Number(c.req.param("id"));

middleware.use(inertia({ version: "1", rootView }));

const routes = middleware
  .all("/rpc", (c) =>
    newRpcResponse(c, new RadioApiServer(), { upgradeWebSocket }),
  )
  .get("/", async (c) => {
    const song = await fetchCurrentSong();
    return c.render("Home", { song, config: radioConfig() });
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
    const post = await findSong(postId(c));
    if (!post) return c.notFound();
    return c.render("Posts/Show", { post });
  })
  .get("/posts/:id{[0-9]+}/edit", async (c) => {
    const post = await findSong(postId(c));
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
        const post = await findSong(postId(c));
        if (!post) return c.notFound();
        return c.render("Posts/Edit", {
          post: { ...post, ...recoverInput(result.data) },
          errors: toFieldErrors(result.error),
        });
      }
    }),
    async (c) => {
      const post = await updateSong(postId(c), c.req.valid("json"));
      if (!post) return c.notFound();
      return c.redirect(`/posts/${post.id}`, 303);
    },
  )
  .delete("/posts/:id{[0-9]+}", async (c) => {
    if (!(await deleteSong(postId(c)))) return c.notFound();
    return c.redirect("/posts", 303);
  });

export default routes;
export type AppType = typeof routes;
