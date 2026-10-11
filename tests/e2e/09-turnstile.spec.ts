import { expect, test, visit } from "./support/helpers";

/**
 * Flow 9: regression for the empty `cf-turnstile-response` field (production log: missing-input-response).
 * The server runs in Turnstile bypass, so it hands the client an empty site key and no widget renders.
 * Here the RSC payload of the client-side navigation to /sifremi-unuttum is rewritten to carry a site key
 * and the Turnstile script is replaced by a fake that reports a token. The real widget component then
 * runs and we can check that the token survives re-renders and reaches the server action.
 * (A full page load is not rewritten: the server-rendered HTML would then disagree with the payload.)
 */
const FAKE_TOKEN = "e2e-fake-token";
const FAKE_SCRIPT = `
window.turnstile = {
  render: function (el, opts) { setTimeout(function () { opts.callback("${FAKE_TOKEN}"); }, 50); return "w1"; },
  reset: function () {},
  remove: function () {},
};`;

test("widget token forma yazılır ve sunucuya gönderilir", async ({ page, context }) => {
  // Registered after the helper's abort rule, so it takes precedence for the script URL.
  await context.route(/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/, (route) =>
    route.fulfill({ contentType: "application/javascript", body: FAKE_SCRIPT }),
  );

  let patched = false;
  await page.route(/\/sifremi-unuttum(\?|$)/, async (route) => {
    // Only the RSC navigation fetch; the server action POST must go through untouched.
    const request = route.request();
    if (request.method() !== "GET" || request.resourceType() === "document") return route.continue();
    const response = await route.fetch();
    const body = (await response.text()).replaceAll(/turnstileSiteKey\\?":\\?"\\?"/g, () => {
      patched = true;
      return String.raw`turnstileSiteKey":"e2e-site-key"`;
    });
    const headers = Object.fromEntries(
      Object.entries(response.headers()).filter(([k]) => !["content-length", "content-encoding", "transfer-encoding"].includes(k)),
    );
    await route.fulfill({ response, body, headers });
  });

  await visit(page, "/giris");
  await page.getByRole("link", { name: "Şifremi unuttum" }).click();
  await page.waitForURL(/\/sifremi-unuttum$/);
  expect(patched, "site key could not be injected into the RSC payload").toBe(true);

  const local = page.locator("form:visible input[name=local]:visible");
  await local.fill("990000001");

  // The login page stays mounted (hidden) after client navigation, so scope everything to this form.
  const form = page.locator("form:visible");
  const hidden = form.locator("input[name=cf-turnstile-response]");
  const submit = form.getByRole("button", { name: "Sıfırlama linki gönder" });
  await expect(submit).toBeEnabled(); // label only appears once the token arrived and the form re-rendered
  // The token must survive that (and further) re-renders: this is what was wiped in production.
  await expect(hidden).toHaveValue(FAKE_TOKEN);
  await local.fill("990000002");
  await expect(hidden).toHaveValue(FAKE_TOKEN);

  const requestPromise = page.waitForRequest(
    (req) => req.method() === "POST" && (req.postData() ?? "").includes("cf-turnstile-response"),
  );
  await submit.click();
  const body = (await requestPromise).postData() ?? "";
  expect(body.replace(/\s+/g, " ")).toMatch(new RegExp(`name="(_[0-9]+_)?cf-turnstile-response" ${FAKE_TOKEN} `));
});
