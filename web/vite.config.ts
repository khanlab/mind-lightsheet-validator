import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  // VITE_BASE is set to the GitHub Pages sub-path in CI (e.g. /mind-lightsheet-validator/).
  // Falls back to "/" for local development.
  base: process.env.VITE_BASE ?? "/",
  resolve: {
    alias: {
      "@validator": resolve(__dirname, "../src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
