import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["@react-three/fiber", "react", "react-dom", "three"],
  },
  optimizeDeps: {
    // These deployed compatibility packages still emit CommonJS during the incremental migration.
    include: [
      "@TBS/common",
      "@TBS/game-setup",
      "@TBS/presentation",
      "@TBS/renderer-2d",
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
