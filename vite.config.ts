import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "app-shell",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  test: {
    include: ["../tests/**/*.test.ts"],
    exclude: ["../node_modules/**", "../dist/**", "../tests/e2e/**"]
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  },
  server: {
    port: 3000
  },
  preview: {
    port: 4173
  }
});
