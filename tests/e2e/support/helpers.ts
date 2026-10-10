import { expect, test as base, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { MOBILE } from "./env";

/** `test` with Cloudflare Turnstile blocked: its script is irrelevant (server bypass) and may hang offline. */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.route(/challenges\.cloudflare\.com/, (route) => route.abort());
    await provide(context);
  },
});
export { expect };

/** Fresh browser context for a second user inside one test. */
export async function newContext(browser: Browser, mobile: boolean): Promise<BrowserContext> {
  const context = await browser.newContext({
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    ...(mobile ? MOBILE : { viewport: { width: 1280, height: 800 } }),
  });
  await context.route(/challenges\.cloudflare\.com/, (route) => route.abort());
  return context;
}

/** Navigates and waits until client scripts settled, so forms are hydrated before we type. */
export async function visit(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle").catch(() => {});
}

type Credentials = { kind: "student" | "staff"; local: string; password: string };

/** Logs in through the real form. `landing` is matched against the pathname the redirect is expected to reach. */
export async function login(page: Page, who: Credentials, landing: RegExp) {
  await visit(page, "/giris");
  if (who.kind === "staff") await page.getByRole("tab", { name: "Personel" }).click();
  await page.locator("input[name=local]:visible").fill(who.local);
  await page.locator("input[name=password]:visible").fill(who.password);
  await page.getByRole("button", { name: /^Giriş yap/ }).click();
  await page.waitForURL((url) => landing.test(url.pathname));
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Mobile acceptance: no horizontal scrolling at 375px. */
export async function expectNoHorizontalScroll(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: "horizontal overflow at 375px" })
    .toBeLessThanOrEqual(375);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Extracts the first uuid that follows `prefix` in a URL path. */
export function idFromUrl(url: string, prefix: string): string {
  const match = new RegExp(`${prefix}/(${UUID})`).exec(url);
  if (!match) throw new Error(`No id after "${prefix}" in ${url}`);
  return match[1]!;
}

export const uuidSegment = UUID;
