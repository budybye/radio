import { Scalar } from "@scalar/hono-api-reference";
import { openAPIRouteHandler } from "hono-openapi";
import type { Context, Hono } from "hono";
import type { OpenAPIV3_1 } from "openapi-types";

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

/** ローカル dev と `*.workers.dev` のみ OpenAPI + Scalar を公開（カスタムドメインは 404） */
function openApiEnabled(c: Context<Env>): boolean {
  if (import.meta.env.DEV) return true;
  const hostname = new URL(c.req.url).hostname;
  return hostname.endsWith(".workers.dev");
}

const scalarUi = Scalar<Env>({
  url: "/openapi.json",
  pageTitle: "radio API",
  theme: "default",
});

/** `/openapi.json` — ローカル dev と `*.workers.dev` のみ */
export function mountOpenApi<T extends Hono<Env>>(
  app: T,
  documented: Hono<Env>,
) {
  const handler = openAPIRouteHandler(documented, {
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
      },
      paths: AGENT_PATHS,
    },
    exclude: ["/", /^\/posts(\/|$)/],
  });

  const serveScalar = async (c: Context<Env>) => {
    if (!openApiEnabled(c)) return c.notFound();
    return scalarUi(c, async () => {});
  };

  return app
    .get("/openapi.json", async (c, next) => {
      if (!openApiEnabled(c)) return c.notFound();
      return handler(c, next);
    })
    .get("/scalar", serveScalar)
    .get("/docs", serveScalar);
}
