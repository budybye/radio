import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import type { Context } from "hono";

import { matchMpdResourceOrHttp, respondMpdTextError } from "../lib/radio/mpd-http";
import { recoverInput, toFieldErrors, emptyQueueFormErrors } from "../lib/validation";
import { queueSongInputSchema } from "../schemas/queue";
import { basic, basicOrBearer } from "./middleware";
import { createSong, deleteSong, findSong, listSongs, updateSong } from "./mpd/playlist";

const getSongIdFromRequest = (c: Context) => Number(c.req.param("id"));

export const queue = new Hono<Env>()
  .get("/", basic, async (c) => {
    const songsResult = await listSongs();

    if (songsResult.isErr()) return respondMpdTextError(c, songsResult.error);

    return c.render("Queue/Index", { tracks: songsResult.value });
  })
  .get("/new", basic, (c) =>
    c.render("Queue/New", {
      values: { file: "" },
      errors: emptyQueueFormErrors,
    }),
  )
  .post(
    "/",
    basicOrBearer,
    sValidator("json", queueSongInputSchema, (result, c) => {
      if (!result.success) {
        return c.render("Queue/New", {
          values: recoverInput(result.data),
          errors: toFieldErrors(result.error),
        });
      }
    }),
    async (c) => {
      const createdSongResult = await createSong(c.req.valid("json"));

      if (createdSongResult.isErr()) return respondMpdTextError(c, createdSongResult.error);

      return c.redirect(`/queue/${createdSongResult.value.id}`, 303);
    },
  )
  .get("/:id{[0-9]+}", basic, async (c) => {
    const foundSongResult = await findSong(getSongIdFromRequest(c));

    return matchMpdResourceOrHttp(c, foundSongResult, (song) => c.render("Queue/Show", { song }));
  })
  .get("/:id{[0-9]+}/edit", basic, async (c) => {
    const foundSongResult = await findSong(getSongIdFromRequest(c));

    return matchMpdResourceOrHttp(c, foundSongResult, (song) =>
      c.render("Queue/Edit", {
        song,
        errors: emptyQueueFormErrors,
      }),
    );
  })
  .patch(
    "/:id{[0-9]+}",
    basicOrBearer,
    sValidator("json", queueSongInputSchema, async (result, c) => {
      if (!result.success) {
        const foundSongResult = await findSong(getSongIdFromRequest(c));

        return matchMpdResourceOrHttp(c, foundSongResult, (song) =>
          c.render("Queue/Edit", {
            song: { ...song, ...recoverInput(result.data) },
            errors: toFieldErrors(result.error),
          }),
        );
      }
    }),
    async (c) => {
      const updatedSongResult = await updateSong(getSongIdFromRequest(c), c.req.valid("json"));

      return matchMpdResourceOrHttp(c, updatedSongResult, (song) =>
        c.redirect(`/queue/${song.id}`, 303),
      );
    },
  )
  .delete("/:id{[0-9]+}", basicOrBearer, async (c) => {
    const deletedSongResult = await deleteSong(getSongIdFromRequest(c));

    if (deletedSongResult.isErr()) return respondMpdTextError(c, deletedSongResult.error);

    return c.redirect("/queue", 303);
  });
