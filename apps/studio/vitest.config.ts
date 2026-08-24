import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    setupFiles: ["./src/test-setup.ts"],
    environment: "jsdom",
    environmentMatchGlobs: [["**/project-store.test.ts", "node"]],
  },
});
