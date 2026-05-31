import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import type { Context } from "hono";

import { recoverInput, toFieldErrors } from "../lib/validation";
import {
  emptyPostFormErrors,
  postSongInputSchema,
} from "../schemas/posts";
import { basic, basicOrBearer } from "./middleware";
import {
  createSong,
  deleteSong,
  findSong,
  listSongs,
  updateSong,
} from "./mpd/playlist";

const postId = (c: Context) => Number(c.req.param("id"));

export const posts = new Hono<Env>()
  .get("/", basic, async (c) => {
    const items = (await listSongs()).match({
      ok: (songs) => songs,
      err: () => [],
    });
    return c.render("Posts/Index", { posts: items });
  })
  .get("/new", basic, (c) =>
    c.render("Posts/New", {
      values: { file: "" },
      errors: emptyPostFormErrors(),
    }),
  )
  .post(
    "/",
    basicOrBearer,
    sValidator("json", postSongInputSchema, (result, c) => {
      if (!result.success) {
        return c.render("Posts/New", {
          values: recoverInput(result.data),
          errors: toFieldErrors(result.error),
        });
      }
    }),
    async (c) => {
      const result = await createSong(c.req.valid("json"));
      if (result.isErr()) return c.text(result.error.message, 502);
      return c.redirect(`/posts/${result.value.id}`, 303);
    },
  )
  .get("/:id{[0-9]+}", basic, async (c) => {
    const result = await findSong(postId(c));
    return result.match({
      ok: (post) => (post ? c.render("Posts/Show", { post }) : c.notFound()),
      err: () => c.notFound(),
    });
  })
  .get("/:id{[0-9]+}/edit", basic, async (c) => {
    const result = await findSong(postId(c));
    return result.match({
      ok: (post) =>
        post
          ? c.render("Posts/Edit", {
              post,
              errors: emptyPostFormErrors(),
            })
          : c.notFound(),
      err: () => c.notFound(),
    });
  })
  .patch(
    "/:id{[0-9]+}",
    basicOrBearer,
    sValidator("json", postSongInputSchema, async (result, c) => {
      if (!result.success) {
        const found = await findSong(postId(c));
        return found.match({
          ok: (post) =>
            post
              ? c.render("Posts/Edit", {
                  post: { ...post, ...recoverInput(result.data) },
                  errors: toFieldErrors(result.error),
                })
              : c.notFound(),
          err: () => c.notFound(),
        });
      }
    }),
    async (c) => {
      const result = await updateSong(postId(c), c.req.valid("json"));
      return result.match({
        ok: (post) =>
          post ? c.redirect(`/posts/${post.id}`, 303) : c.notFound(),
        err: () => c.notFound(),
      });
    },
  )
  .delete("/:id{[0-9]+}", basicOrBearer, async (c) => {
    const result = await deleteSong(postId(c));
    if (result.isErr()) return c.notFound();
    return c.redirect("/posts", 303);
  });
