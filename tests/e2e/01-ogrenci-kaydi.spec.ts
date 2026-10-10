import type { Page } from "@playwright/test";

import { waitForMailLink } from "./support/dev-mail";
import { MOBILE } from "./support/env";
import { expect, expectNoHorizontalScroll, test, visit } from "./support/helpers";
import { loadState, randomPassword, randomStudentNo, saveState } from "./support/state";

/** Flow 1: student registration on a phone (number -> dev mail link -> password + notice -> empty dashboard). */
test.use(MOBILE);
test.describe.configure({ mode: "serial" });

async function register(page: Page, no: string) {
  const email = `${no}@ogr.mku.edu.tr`;
  const password = randomPassword();
  const since = Date.now() - 1000;

  await visit(page, "/kayit");
  await page.locator("input[name=local]:visible").fill(no);
  await page.getByRole("button", { name: "Doğrulama linki gönder" }).click();
  await expect(page.getByRole("heading", { name: "Mailinizi kontrol edin" })).toBeVisible();

  const link = await waitForMailLink({ to: email, linkPath: "/dogrula/", since });
  await visit(page, link);
  await page.locator("input[name=password]:visible").fill(password);
  await page.locator("input[name=confirmPassword]:visible").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Hesabı etkinleştir" }).click();
  await page.waitForURL(/\/hesap/);

  const students = [...(loadState().students ?? []), { local: no, no, email, password }];
  saveState({ students });
  return email;
}

for (const label of ["A", "B"]) {
  test(`öğrenci ${label} kayıt olur ve boş panele düşer`, async ({ page }) => {
    await register(page, randomStudentNo());
    await visit(page, "/ogrenci");
    await expect(page.getByText("Henüz bir derse eklenmediniz")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
