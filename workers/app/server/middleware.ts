import { inertia } from "@hono/inertia";
import { agentsMiddleware } from "hono-agents";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { rootView } from "../inertia";

export const basic = createMiddleware<Env>(async (c, next) => {
  await basicAuth({
    username: c.env.USERNAME,
    password: c.env.PASSWORD,
  })(c, next);
});

const bearer = createMiddleware<Env>(async (c, next) => {
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

function errorFields(cause: unknown) {
  return {
    name: cause instanceof Error ? cause.name : "Error",
    message: cause instanceof Error ? cause.message : String(cause),
    stack: cause instanceof Error ? cause.stack : undefined,
  };
}

function wantsJson(c: { req: { header: (name: string) => string | undefined } }) {
  const accept = c.req.header("Accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

// agentsMiddleware は DO Response（immutable headers）を返すことがある。
// requestId / secureHeaders より内側（先）に置き、ヘッダ追記で 500 にしない。
/** HMR ごとに新しい Hono を返す（シングルトンに route を足すと matcher is already built） */
export function createAppShell(): Hono<Env> {
  return new Hono<Env>()
    .use(
      logger(),
      agentsMiddleware({
        options: { prefix: "agents" },
        onError: (error) =>
          console.error(JSON.stringify({ tag: "[MpdAgent]", ...errorFields(error) })),
      }),
      requestId(),
      secureHeaders(),
      inertia({ version: "1", rootView }),
    )
    .onError((err, c) => {
      const reqId = c.get("requestId");
      const status = err instanceof HTTPException ? err.status : 500;

      console.error(
        JSON.stringify({
          tag: "[radio]",
          level: "error",
          path: c.req.path,
          method: c.req.method,
          requestId: reqId,
          status,
          ...errorFields(err),
        }),
      );

      if (err instanceof HTTPException) {
        return err.getResponse();
      }

      const message = "Internal Server Error";
      return wantsJson(c)
        ? c.json({ error: "internal_error", message, requestId: reqId }, 500)
        : c.text(message, 500);
    })
    // @hono/inertia が NotFoundResponse を text に固定している
    .notFound((c) => c.text("404 Not Found", 404));
}
