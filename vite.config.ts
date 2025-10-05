// vite.config.ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/openaq": {
        target: "https://api.openaq.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/openaq/, ""),
        timeout: 30_000,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("User-Agent", "spaceapps-aqi-prototype");
          });
        },
      },
    },
  },
});
