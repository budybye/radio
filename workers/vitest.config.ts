import { defineConfig } from "vitest/config";

/** Pure lib tests only — main vite.config loads Cloudflare plugin incompatible with vitest */
export default defineConfig({
  test: {
    include: [
      "app/lib/**/*.test.ts",
      "app/schemas/**/*.test.ts",
      "app/server/**/*.test.ts",
      "test/**/*.test.ts",
    ],
  },
});
