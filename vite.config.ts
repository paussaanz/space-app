import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todo lo que empiece por /openaq irá al API real, con CORS resuelto
      "/openaq": {
        target: "https://api.openaq.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/openaq/, ""),
        // timeouts altos por si la red va lenta
        timeout: 30_000,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // puedes añadir cabeceras si OpenAQ las requiere en el futuro
            proxyReq.setHeader("User-Agent", "spaceapps-aqi-prototype");
          });
        },
      },
    },
  },
});
