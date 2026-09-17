import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";

import { mountOpenApi } from "./mount";

describe("mountOpenApi", () => {
  it("keeps OpenAPI JSON and removes Scalar UI", async () => {
    const app = mountOpenApi(new Hono<Env>().get("/health", (c) => c.json({ ok: true })));

    const openApi = await app.request("/openapi.json");
    expect(openApi.status).toBe(200);

    const scalar = await app.request("/scalar");
    expect(scalar.status).toBe(404);
  });
});
