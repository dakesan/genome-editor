/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.TAURI_DEV_HOST || false,
    fs: {
      allow: [".", "pkg"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
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
