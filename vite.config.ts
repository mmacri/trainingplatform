import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    exclude: ["node_modules/**", "dist/**", "tests/e2e/**"]
  },
  server: {
    port: 3000
  },
  preview: {
    port: 4173
  }
});
