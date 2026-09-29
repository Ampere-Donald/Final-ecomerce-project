import { defineConfig } from "vite";
import base from "../vite.config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = path.resolve(
  root,
  "../.local-postgres/refonte-e/integrated-image",
);
export default defineConfig({
  ...base,
  // Exclude the project's real service settings from this isolated build.
  envDir: path.join(runtime, "empty-env"),
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("/api"),
    "import.meta.env.VITE_SANDBOX": JSON.stringify("true"),
    "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(""),
  },
  build: { outDir: path.join(runtime, "site"), emptyOutDir: false },
  preview: {
    host: "127.0.0.1",
    port: 5188,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:3017", changeOrigin: true } },
  },
});
