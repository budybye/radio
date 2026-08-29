import { inertiaPages } from "@hono/inertia/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import agents from "agents/vite";
import { defineConfig } from "vite-plus";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const ignorePatterns = [
  ".agent/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".continue/**",
  ".cursor/**",
  ".gemini/**",
  ".omp/**",
  ".opencode/**",
  ".pi/**",
  ".roo/**",
  ".windsurf/**",
  "tools/oxlint/anti-slop/**",
  "node_modules",
  "public",
  ".wrangler",
  "dist",
];

const antiSlopRules = {
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
} as const;

export default defineConfig({
  environments: {
    client: {
      build: {
        manifest: true,
        rollupOptions: {
          input: "./app/client.tsx",
        },
      },
    },
    ssr: {
      build: {
        emptyOutDir: false,
        rollupOptions: {
          input: "./app/server/index.tsx",
          external: ["cloudflare:workers"],
        },
      },
    },
  },
  plugins: [
    inertiaPages(),
    cloudflare(),
    agents(),
    tailwindcss(),
    ssrPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: { navigateFallback: "" },
      devOptions: { enabled: false },
      pwaAssets: { image: "./public/logo.svg" },
    }),
  ],
  build: { minify: true },
  lint: {
    ignorePatterns,
    jsPlugins: [
      {
        name: "anti-slop",
        specifier: "./tools/oxlint/anti-slop/index.ts",
      },
    ],
    rules: {
      "eslint/no-unused-expressions": [
        "error",
        { allowTaggedTemplates: true },
      ],
      ...antiSlopRules,
    },
  },
  fmt: {
    ignorePatterns,
  },
});
