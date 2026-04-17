import { defineConfig } from "vite";
import { resolve } from "path";

// Popup + Background build.
// Both are loaded as ES modules (popup via <script type="module"> in HTML,
// background via "type": "module" in manifest), so code splitting is fine.
export default defineConfig({
  root: "src",
  publicDir: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/service-worker.ts"),
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
