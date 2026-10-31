import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // /data lives outside /src; scenarios.json is the only source of numbers.
      "@data": fileURLToPath(new URL("./data", import.meta.url)),
    },
  },
});
