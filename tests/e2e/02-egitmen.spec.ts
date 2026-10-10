import { expect, idFromUrl, login, test, uuidSegment, visit } from "./support/helpers";
import { loadState, randomPassword, randomStudentNo, saveState } from "./support/state";

/** Flow 2: admin opens an instructor; the instructor changes the temp password, opens a course and pastes a roster. */
test.describe.configure({ mode: "serial" });

const suffix = Math.random().toString(36).slice(2, 7);
const instructorLocal = `e2e.egitmen.${suffix}`;

test("admin eğitmen hesabı açar", async ({ page }) => {
  const { admin } = loadState();
  await login(page, { kind: "staff", ...admin }, /\/admin/);

  await visit(page, "/admin/egitmenler");
  await page.getByRole("button", { name: "Eğitmen ekle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input[name=local]").fill(instructorLocal);
  await dialog.locator("input[name=displayName]:visible").fill("Dr. E2E Eğitmen");
  await dialog.getByRole("button", { name: "Hesap oluştur" }).click();

  const tempPassword = (await page.locator('code[aria-label="Geçici şifre"]').textContent())?.trim();
  expect(tempPassword).toBeTruthy();
  saveState({
    instructor: { local: instructorLocal, email: `${instructorLocal}@mku.edu.tr`, password: tempPassword! },
  });

  await page.getByRole("dialog").getByRole("button", { name: "Tamam" }).click();
  await expect(page.getByText("Dr. E2E Eğitmen").first()).toBeVisible();
});

test("eğitmen geçici şifreyle girer ve şifresini değiştirir", async ({ page }) => {
  const instructor = loadState().instructor!;
  await login(page, { kind: "staff", ...instructor }, /\/sifre-degistir/);

  const next = randomPassword();
  await page.locator("input[name=currentPassword]:visible").fill(instructor.password);
  await page.locator("input[name=password]:visible").fill(next);
  await page.locator("input[name=confirmPassword]:visible").fill(next);
  await page.getByRole("button", { name: "Şifreyi değiştir" }).click();
  await page.waitForURL(/\/egitmen/);
  saveState({ instructor: { ...instructor, password: next } });
});

test("eğitmen ders açar ve numara listesi yapıştırır", async ({ page }) => {
  const state = loadState();
  const [studentA, studentB] = state.students!;
  const unregisteredNo = randomStudentNo();
  await login(page, { kind: "staff", ...state.instructor! }, /\/egitmen/);

  await visit(page, "/egitmen/dersler");
  await page.getByRole("button", { name: "Yeni ders" }).first().click();
  const courseDialog = page.getByRole("dialog");
  await courseDialog.locator("input[name=code]:visible").fill("E2E101");
  await courseDialog.locator("input[name=name]:visible").fill("E2E Programlama");
  await courseDialog.getByRole("button", { name: "Dersi oluştur" }).click();
  await page.waitForURL(new RegExp(`/egitmen/dersler/${uuidSegment}`));
  const courseId = idFromUrl(page.url(), "dersler");
  saveState({ courseId, unregisteredNo });

  await visit(page, `/egitmen/dersler/${courseId}?sekme=ogrenciler`);
  await page.getByRole("button", { name: "Öğrenci ekle" }).first().click();
  const rosterDialog = page.getByRole("dialog");
  await rosterDialog
    .getByRole("textbox", { name: "Öğrenci listesi" })
    .fill([studentA!.no, studentB!.no, unregisteredNo, "abc"].join("\n"));
  await rosterDialog.getByRole("button", { name: /öğrenciyi ekle$/ }).click();

  const summary = rosterDialog.getByRole("listitem");
  await expect(summary.filter({ hasText: /^3\s*eklendi$/ })).toBeVisible();
  await expect(summary.filter({ hasText: /^1\s*geçersiz$/ })).toBeVisible();
  await rosterDialog.getByRole("button", { name: "Tamam" }).click();

  await expect(page.getByText(/3 öğrenci · 2 kayıtlı/)).toBeVisible();
});
