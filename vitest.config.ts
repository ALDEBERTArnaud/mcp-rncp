import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.ts",
      "eval/tests/**/*.test.ts",
    ],
    testTimeout: 20_000,
  },
});
