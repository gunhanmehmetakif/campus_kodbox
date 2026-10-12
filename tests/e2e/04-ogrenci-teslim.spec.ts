import { MOBILE } from "./support/env";
import { expect, expectNoHorizontalScroll, login, newContext, test, visit } from "./support/helpers";
import { loadState } from "./support/state";

/** Flow 4: students open the assignment from the notification (redirect to the feed card) and submit a Drive link in the dialog. */
test.use(MOBILE);
test.describe.configure({ mode: "serial" });

const driveLink = () => `https://drive.google.com/file/d/e2e${Math.random().toString(36).slice(2, 12)}/view?usp=sharing`;

test("öğrenci A bildirimden ödeve gider ve teslim eder", async ({ page }) => {
  const { students, courseId } = loadState();
  const student = students![0]!;
  await login(page, { kind: "student", local: student.no, password: student.password }, /\/ogrenci|\/hesap/);
  await visit(page, "/ogrenci");

  // Enrolled + announcement + assignment notifications.
  const bell = page.getByRole("link", { name: /Bildirimler, \d+ okunmamış/ }).first();
  await expect(bell).toBeVisible();
  await bell.click();
  await page.waitForURL(/\/bildirimler/);

  await page.getByRole("button", { name: /Yeni ödev/ }).click();
  // The legacy /ogrenci/odevler/<id> link redirects to the feed card, which opens the submission dialog.
  await page.waitForURL(/\/ogrenci\/dersler\/[^?]+\?odev=/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Teslim" })).toBeVisible();

  // Enter submits without blurring the field, so the Drive reachability check (an outbound request) never fires.
  const linkField = dialog.locator("input[inputmode=url]:visible");
  await linkField.fill(driveLink());
  await linkField.press("Enter");
  await expect(page.getByText("Teslim edildi.", { exact: true })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expectNoHorizontalScroll(page);

  // The submitted assignment leaves the dashboard's upcoming list ...
  await visit(page, "/ogrenci");
  await expect(page.getByRole("heading", { name: "Derslerim" })).toBeVisible();
  await expect(page.getByRole("link", { name: /E2E ödevi/ })).toHaveCount(0);

  // ... and shows up under "Teslim edilen" in the course's assignment filter ...
  await visit(page, `/ogrenci/dersler/${courseId}?filtre=odev`);
  await expect(page.getByRole("region", { name: "Teslim edilen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "E2E ödevi" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  // ... and on the "Ödevlerim" page.
  await visit(page, "/ogrenci/odevlerim");
  await expect(page.getByRole("heading", { name: "Ödevlerim" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Teslim edilen" }).getByRole("heading", { name: "E2E ödevi" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("öğrenci B ödevi teslim eder", async ({ browser }) => {
  const { students, assignmentId } = loadState();
  const student = students![1]!;
  const context = await newContext(browser, true);
  const page = await context.newPage();
  try {
    await login(page, { kind: "student", local: student.no, password: student.password }, /\/ogrenci|\/hesap/);
    await visit(page, `/ogrenci/odevler/${assignmentId}`);
    await page.waitForURL(/\/ogrenci\/dersler\/[^?]+\?odev=/);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const linkField = dialog.locator("input[inputmode=url]:visible");
    await linkField.fill(driveLink());
    await linkField.press("Enter");
    await expect(page.getByText("Teslim edildi.", { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expectNoHorizontalScroll(page);
  } finally {
    await context.close();
  }
});
