import { toJsonSchema } from "@valibot/to-json-schema";
import { openAPIRouteHandler } from "hono-openapi";
import type { Context, Hono } from "hono";
import type { OpenAPIV3_1 } from "openapi-types";

import { mpdAgentStateSchema } from "../../schemas/openapi/agents";

const OPENAPI_INFO = {
  title: "radio",
  version: "1.0.0",
  description:
    "MPD diagnostic JSON, queue automation (`/api/posts`), and MpdAgent WebSocket. Inertia HTML routes (`/`, `/posts`) are excluded.",
} as const;

const AGENT_PATHS: OpenAPIV3_1.PathsObject = {
  "/agents/MpdAgent/{instance}": {
    get: {
      tags: ["agents"],
      summary: "MpdAgent WebSocket (useAgent)",
      description:
        'Connect via Agents SDK `useAgent({ agent: "MpdAgent", name: "radio" })`. Callable: `setWatchActive(boolean)`, `setPlaybackActive(boolean)`, `getCurrentSongView(songid?)`. Broadcast state: `MpdAgentState` (songid, song, mpdState, listenerCount, lastError).',
      parameters: [
        {
          name: "instance",
          in: "path",
          required: true,
          schema: { type: "string", default: "radio" },
        },
      ],
      responses: {
        "101": { description: "WebSocket upgrade" },
        "200": { description: "Agent HTTP handler" },
      },
    },
  },
};

/** ローカル dev と `*.workers.dev` のみ OpenAPI を公開（カスタムドメインは 404） */
function openApiEnabled(c: Context<Env>): boolean {
  if (import.meta.env.DEV) return true;
  const hostname = new URL(c.req.url).hostname;
  return hostname.endsWith(".workers.dev");
}


/** `/openapi.json` — ローカル dev と `*.workers.dev` のみ */
export function mountOpenApi<T extends Hono<Env>>(app: T) {
  const handler = openAPIRouteHandler(app, {
    documentation: {
      openapi: "3.1.0",
      info: OPENAPI_INFO,
      tags: [
        { name: "mpd", description: "MPD / mpc-bridge diagnostic JSON" },
        { name: "api", description: "Queue CRUD (JSON)" },
        { name: "agents", description: "MpdAgent Durable Object" },
      ],
      components: {
        securitySchemes: {
          basicAuth: { type: "http", scheme: "basic" },
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "TOKEN",
          },
        },
        schemas: {
          // SAFETY: valibot JSON Schema output matches OpenAPIV3_1.SchemaObject for documentation.
          MpdAgentState:
            toJsonSchema(mpdAgentStateSchema) as OpenAPIV3_1.SchemaObject,
        },
      },
      paths: AGENT_PATHS,
    },
    exclude: ["/", /^\/posts(\/|$)/],
  });


  return app
    .get("/openapi.json", async (c, next) => {
      if (!openApiEnabled(c)) return c.notFound();
      return handler(c, next);
    });
}
