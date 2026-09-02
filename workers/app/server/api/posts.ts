import { describeRoute, resolver, validator } from "hono-openapi";
import { Hono } from "hono";
import type { Context } from "hono";
import type { OpenAPIV3 } from "openapi-types";

import {
  matchMpdResourceOrHttp,
  respondMpdJsonError,
  respondMpdTextError,
} from "../../lib/radio/mpd-http";
import {
  postSongInputSchema,
  songListSchema,
  songWireSchema,
} from "../../schemas/openapi/posts";
import { mpdJsonErrorResponses } from "../openapi/responses";
import { basicOrBearer } from "../middleware";
import {
  createSong,
  deleteSong,
  findSong,
  listSongs,
  updateSong,
} from "../mpd/playlist";

const API_SECURITY = [
  { basicAuth: [] },
  { bearerAuth: [] },
] satisfies OpenAPIV3.SecurityRequirementObject[];

const postId = (c: Context) => Number(c.req.param("id"));

/** OpenAPI 対象の JSON キュー API（Inertia `/posts` とは別） */
export function createApiPostsRoutes() {
  return new Hono<Env>()
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
      const result = await listSongs();
      if (result.isErr()) return respondMpdJsonError(c, result.error);
      return c.json(result.value);
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
    validator("json", postSongInputSchema),
    async (c) => {
      const result = await createSong(c.req.valid("json"));
      if (result.isErr()) return respondMpdJsonError(c, result.error);
      return c.json(result.value, 201);
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
      const result = await findSong(postId(c));
      return matchMpdResourceOrHttp(c, result, (post) => c.json(post));
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
    validator("json", postSongInputSchema),
    async (c) => {
      const result = await updateSong(postId(c), c.req.valid("json"));
      return matchMpdResourceOrHttp(c, result, (post) => c.json(post));
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
      const result = await deleteSong(postId(c));
      if (result.isErr()) return respondMpdTextError(c, result.error);
      return c.body(null, 204);
    },
  );
}

export const apiPosts = createApiPostsRoutes();
