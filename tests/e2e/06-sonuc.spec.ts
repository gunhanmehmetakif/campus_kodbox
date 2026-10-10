import { MOBILE } from "./support/env";
import { expect, expectNoHorizontalScroll, login, test, visit } from "./support/helpers";
import { loadState } from "./support/state";

/** Flow 6: the student sees the "score published" notification and the result card. */
test.use(MOBILE);

test("öğrenci puan bildirimini ve sonuç kartını görür", async ({ page }) => {
  const { students, scores } = loadState();
  const student = students![0]!;
  await login(page, { kind: "student", local: student.no, password: student.password }, /\/ogrenci|\/hesap/);

  await visit(page, "/bildirimler");
  const notification = page.getByRole("button", { name: /Puanınız yayınlandı/ });
  await expect(notification).toBeVisible();
  await notification.click();
  await page.waitForURL(/\/ogrenci\/odevler\//);

  const result = page.locator('section[aria-label="Sonuç"]');
  await expect(result).toBeVisible();
  await expect(result).toContainText("Puanınız yayınlandı");
  await expect(result).toContainText(String(scores![student.no]));
  await expectNoHorizontalScroll(page);
});
