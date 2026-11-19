import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Library code logs expected failures (e.g. "email not sent"); keep test output readable.
    silent: "passed-only",
  },
});
