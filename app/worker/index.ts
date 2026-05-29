import app from "../src";

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Cloudflare.Env>;
