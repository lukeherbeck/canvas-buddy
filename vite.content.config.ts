import { defineConfig } from "vite";
import { resolve } from "path";

// Content script build — outputs a single self-contained IIFE.
// Chrome loads content scripts as classic scripts (not ES modules),
// so the output must have zero import statements. IIFE format inlines
// every dependency directly, producing one file with no imports.
export default defineConfig({
  root: "src",
  publicDir: false,
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      formats: ["iife"],
      name: "CanvasBuddy",
      fileName: () => "content.js",
    },
    minify: true,
    sourcemap: false,
    target: "safari15",
  },
});
