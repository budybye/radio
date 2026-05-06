import { Hono } from "hono";
import { renderer } from "./renderer";
import { root } from "./root";

export const app = new Hono<Env>()
  .use(renderer)
  // frontend
  .route("/", root);

export type AppType = typeof app;
