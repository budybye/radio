import { inertiaPages } from "@hono/inertia/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import agents from "agents/vite";
import { defineConfig } from "vite-plus";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    mainFields: ["module", "main"],
  },
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
      pwaAssets: { image: "./public/logo.svg" },
    }),
  ],
  server: { allowedHosts: ["044g.com", "localhost"] },
  build: { minify: true },
});
