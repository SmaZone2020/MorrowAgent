import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Tests run against the same aliases as the app. Only pure modules are covered
// here: anything that talks to Tauri needs the real window, so it is exercised
// by the Rust suite or by hand.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
