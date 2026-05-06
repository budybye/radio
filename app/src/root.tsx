import { Hono } from "hono";

const app = new Hono<Env>();

export const root = app.get("/", (c) => {
  return c.render(
    <>
      <div id="root" />
    </>,
  );
});
