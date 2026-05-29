import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite-plus";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      react: "hono/jsx/dom",
      "react-dom": "hono/jsx/dom",
      "use-sync-external-store/shim/index.js": "hono/jsx/dom",
    },
    mainFields: ["module", "main"],
  },
  environments: {
    client: {
      build: {
        manifest: true,
        rollupOptions: {
          input: "./src/client/main.tsx",
        },
      },
    },
    ssr: {
      build: {
        emptyOutDir: false,
        rollupOptions: {
          input: "src/index.ts",
          external: ["cloudflare:workers", "cloudflare:sockets"],
        },
      },
    },
  },
  plugins: [
    cloudflare(),
    tailwindcss(),
    ssrPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      workbox: { navigateFallback: "" },
      pwaAssets: { image: "./public/logo.svg" },
    }),
  ],
  server: { allowedHosts: ["044g.com"] },
  build: { minify: true },
});
