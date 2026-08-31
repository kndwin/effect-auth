import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
