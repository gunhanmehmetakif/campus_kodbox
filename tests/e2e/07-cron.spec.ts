import { CRON_SECRET } from "./support/env";
import { expect, test } from "./support/helpers";

/** Flow 7: the hourly cron endpoint is protected by the shared secret. */
test("cron ucu secret olmadan 401, doğru secret ile 200 döner", async ({ request }) => {
  const anonymous = await request.post("/api/cron/saatlik");
  expect(anonymous.status()).toBe(401);

  const wrong = await request.post("/api/cron/saatlik", { headers: { Authorization: "Bearer wrong-secret" } });
  expect(wrong.status()).toBe(401);

  const ok = await request.post("/api/cron/saatlik", { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  const json = (await ok.json()) as { reminders: unknown; cleanup: unknown };
  expect(json).toHaveProperty("reminders");
  expect(json).toHaveProperty("cleanup");
});
