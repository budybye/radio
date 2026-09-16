import { describeRoute, resolver, validator } from "hono-openapi";
import { Hono } from "hono";
import type { Context } from "hono";
import type { OpenAPIV3 } from "openapi-types";

import { matchMpdResourceOrHttp, respondMpdJsonError } from "../../lib/radio/mpd-http";
import { queueSongInputSchema, songListSchema, songWireSchema } from "../../schemas/openapi/queue";
import { mpdJsonErrorResponses } from "../openapi/responses";
import { basicOrBearer } from "../middleware";
import { createSong, deleteSong, findSong, listSongs, updateSong } from "../mpd/playlist";

const API_SECURITY: OpenAPIV3.SecurityRequirementObject[] = [{ basicAuth: [] }, { bearerAuth: [] }];

const getSongIdFromRequest = (c: Context) => Number(c.req.param("id"));

/** OpenAPI 対象の JSON キュー API（Inertia `/queue` とは別） */
export const apiQueue = new Hono<Env>()
  .use(basicOrBearer)
  .get(
    "/",
    describeRoute({
      tags: ["api"],
      summary: "List queue songs",
      security: API_SECURITY,
      responses: {
        200: {
          description: "MPD playlist",
          content: {
            "application/json": { schema: resolver(songListSchema) },
          },
        },
        ...mpdJsonErrorResponses,
      },
    }),
    async (c) => {
      const songsResult = await listSongs();

      if (songsResult.isErr()) return respondMpdJsonError(c, songsResult.error);

      return c.json(songsResult.value);
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["api"],
      summary: "Add song to queue",
      security: API_SECURITY,
      responses: {
        201: {
          description: "Created song",
          content: {
            "application/json": { schema: resolver(songWireSchema) },
          },
        },
        ...mpdJsonErrorResponses,
      },
    }),
    validator("json", queueSongInputSchema),
    async (c) => {
      const createdSongResult = await createSong(c.req.valid("json"));

      if (createdSongResult.isErr()) return respondMpdJsonError(c, createdSongResult.error);

      return c.json(createdSongResult.value, 201);
    },
  )
  .get(
    "/:id{[0-9]+}",
    describeRoute({
      tags: ["api"],
      summary: "Get queue song by id",
      security: API_SECURITY,
      responses: {
        200: {
          description: "Song",
          content: {
            "application/json": { schema: resolver(songWireSchema) },
          },
        },
        404: { description: "Song not in queue" },
        502: mpdJsonErrorResponses[502],
      },
    }),
    async (c) => {
      const foundSongResult = await findSong(getSongIdFromRequest(c));

      return matchMpdResourceOrHttp(c, foundSongResult, (song) => c.json(song));
    },
  )
  .patch(
    "/:id{[0-9]+}",
    describeRoute({
      tags: ["api"],
      summary: "Update queue song file path",
      security: API_SECURITY,
      responses: {
        200: {
          description: "Updated song",
          content: {
            "application/json": { schema: resolver(songWireSchema) },
          },
        },
        404: { description: "Song not in queue" },
        502: mpdJsonErrorResponses[502],
      },
    }),
    validator("json", queueSongInputSchema),
    async (c) => {
      const updatedSongResult = await updateSong(getSongIdFromRequest(c), c.req.valid("json"));

      return matchMpdResourceOrHttp(c, updatedSongResult, (song) => c.json(song));
    },
  )
  .delete(
    "/:id{[0-9]+}",
    describeRoute({
      tags: ["api"],
      summary: "Remove song from queue",
      security: API_SECURITY,
      responses: {
        204: { description: "Deleted" },
        ...mpdJsonErrorResponses,
      },
    }),
    async (c) => {
      const deletedSongResult = await deleteSong(getSongIdFromRequest(c));

      if (deletedSongResult.isErr()) return respondMpdJsonError(c, deletedSongResult.error);

      return c.body(null, 204);
    },
  );
