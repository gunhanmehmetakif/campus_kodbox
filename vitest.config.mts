import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Unit tests live in tests/unit, DB integration tests in tests/db (*.db.test.ts). DB tests
 * run against the test database and are skipped when it is unreachable.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" throws outside Next; point it at an empty module in tests.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    testTimeout: 15_000,
    // DB tests share one test database.
    fileParallelism: false,
  },
});
