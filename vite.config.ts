/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Serve the pkg/ directory for WASM files.
  server: {
    fs: {
      allow: [".", "pkg"],
    },
  },
  // Exclude WASM package from dependency optimization.
  optimizeDeps: {
    exclude: ["genome-editor-wasm"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
