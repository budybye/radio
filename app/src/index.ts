import { Hono } from "hono";
import { renderer } from "./renderer";
import { root } from "./root";
import { mpd } from "./server/mpd";

const app = new Hono<Env>().route("/api", mpd).use(renderer).route("/", root);

export default app;
export type AppType = typeof app;
