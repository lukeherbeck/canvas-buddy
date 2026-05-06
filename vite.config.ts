import { defineConfig } from "vite";
import { resolve } from "path";

// Popup build. Content scripts are built separately as a self-contained IIFE.
export default defineConfig({
  root: "src",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
    minify: true,
    sourcemap: false,
    target: "safari15",
  },
});
