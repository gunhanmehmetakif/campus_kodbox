import { expect, login, test } from "./support/helpers";
import { loadState } from "./support/state";

/** Flow 8: role boundaries and the login redirect. */
test("öğrenci /egitmen adresinde kendi paneline yönlenir", async ({ page }) => {
  const student = loadState().students![0]!;
  await login(page, { kind: "student", local: student.no, password: student.password }, /\/ogrenci|\/hesap/);

  await page.goto("/egitmen");
  await page.waitForURL(/\/ogrenci$/);
  await page.goto("/admin");
  await page.waitForURL(/\/ogrenci$/);
});

test("giriş yapmamış kullanıcı /ogrenci adresinde girişe yönlenir", async ({ page }) => {
  await page.goto("/ogrenci");
  await page.waitForURL(/\/giris\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/ogrenci");
});
