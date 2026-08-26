import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@TBS/protocol": fileURLToPath(new URL("../packages/protocol/dist/index.js", import.meta.url)),
      "@TBS/renderer-2d": fileURLToPath(new URL("../packages/renderer-2d/src/index.ts", import.meta.url)),
    },
    dedupe: ["@react-three/fiber", "react", "react-dom", "three"],
  },
  optimizeDeps: {
    // Prebundle current CommonJS workspace entry points reached by the browser app.
    // Workspace dist files can change without the lockfile/config cache key changing,
    // so rebuild the prebundle whenever the development server starts.
    force: true,
    include: [
      "@TBS/game-rules",
      "@TBS/game-setup",
      "@TBS/presentation",
      "@TBS/protocol",
    ],
  },
  build: {
    // Raw chunks are warning-only; enforced gzip budgets and lazy-3D splitting live in
    // scripts/check-performance-budgets.mjs and docs/performance/3d-renderer-budget.md.
    chunkSizeWarningLimit: 1550,
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/",
      },
    },
    env: {
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
    },
    globals: true,
    setupFiles: "./src/setupTests.ts",
    css: false,
  },
});
