import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Birim testleri: `*.test.ts` dosyaları test ettikleri modülün YANINDA durur.
 * DB entegrasyon testleri (`*.db.test.ts`) TEST_DATABASE_URL erişilebilirse çalışır, yoksa atlanır.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" Next dışında hata fırlatır; testlerde boş modüle yönlendirilir.
      "server-only": path.resolve(import.meta.dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./test/setup.ts"],
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
