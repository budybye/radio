import { agentsMiddleware } from "hono-agents";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { contextStorage } from "hono/context-storage";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import { requestId } from "hono/request-id";
import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { createMiddleware } from "hono/factory";

export const basic = createMiddleware<Env>(async (c, next) => {
  await basicAuth({
    username: c.env.USERNAME,
    password: c.env.PASSWORD,
  })(c, next);
});

export const bearer = createMiddleware<Env>(async (c, next) => {
  await bearerAuth<Env>({
    token: c.env.TOKEN,
  })(c, next);
});

export const basicOrBearer = createMiddleware<Env>(async (c, next) => {
  const auth = c.req.header("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) {
    return bearer(c, next);
  }
  return basic(c, next);
});

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
