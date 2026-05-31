import { agentsMiddleware } from "hono-agents";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { contextStorage } from "hono/context-storage";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { requestId } from "hono/request-id";

const middleware = new Hono<Env>().use(
  logger(),
  contextStorage(),
  requestId(),
  secureHeaders(),
  timing(),
  agentsMiddleware({
    onError: (error) => console.error("[MpdAgent]", error),
  }),
);

export default middleware;
