import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // El backend ya monta bajo /api, así que NO reescribimos.
      "/api": { target: "http://127.0.0.1:3005", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
});
