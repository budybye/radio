import app from "../src/server";

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Cloudflare.Env>;
