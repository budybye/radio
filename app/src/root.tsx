import { Hono } from "hono";

const app = new Hono<Env>();

app.get("/", (c) => {
  return c.render(
    <>
      <div id="root" />
    </>,
  );
});

export const root = app;
