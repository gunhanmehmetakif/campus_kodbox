import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, E2E_PORT, serverEnv } from "./tests/e2e/support/env";

/**
 * Playwright e2e (docs/fazlar/F7-cila-yayin.md section 2). Flows share one database and depend on
 * each other in file order (01 -> 08), so a single worker runs them serially.
 * Desktop is the default; mobile flows opt in with `test.use(MOBILE)` (tests/e2e/support/env.ts).
 * globalSetup resets and seeds the dedicated e2e database; the dev server below points at it.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npx next dev -p ${E2E_PORT}`,
    // A static public file: answers without touching the database, which globalSetup resets afterwards.
    url: `${BASE_URL}/sw.js`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: serverEnv(),
    stdout: "ignore",
    stderr: "pipe",
  },
});
