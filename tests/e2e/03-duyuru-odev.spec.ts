import { expect, idFromUrl, login, test, uuidSegment, visit } from "./support/helpers";
import { loadState, saveState } from "./support/state";

/** Flow 3: the instructor publishes an announcement and a late-allowed, graded assignment. */
test.describe.configure({ mode: "serial" });

test("eğitmen duyuru yayınlar", async ({ page }) => {
  const { instructor, courseId } = loadState();
  await login(page, { kind: "staff", ...instructor! }, /\/egitmen/);

  await visit(page, `/egitmen/dersler/${courseId}/paylasim/yeni?tur=duyuru`);
  await page.locator("input[name=title]:visible").fill("E2E duyurusu");
  await page.getByLabel("Metin", { exact: true }).fill("Bu bir **uçtan uca** test duyurusudur.");
  await page.getByRole("button", { name: "Yayınla" }).click();

  await page.waitForURL(/sekme=akis/);
  await expect(page.getByText("E2E duyurusu").first()).toBeVisible();
});

test("eğitmen geç teslimli, puanlı ödev yayınlar", async ({ page }) => {
  const { instructor, courseId } = loadState();
  await login(page, { kind: "staff", ...instructor! }, /\/egitmen/);

  await visit(page, `/egitmen/dersler/${courseId}/odev/yeni`);
  await page.locator("input[name=title]:visible").fill("E2E ödevi");
  await page.getByLabel("Açıklama", { exact: true }).fill("Çözümünüzü Drive linkiyle teslim edin.");

  const lateSwitch = page.getByRole("switch", { name: /Süre dolduktan sonra teslime izin ver/ });
  await lateSwitch.click();
  await expect(lateSwitch).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Puan düş" }).click();
  await page.getByLabel("Düşülecek puan").fill("5");
  // Grading is on by default with a maximum of 100.
  await expect(page.getByLabel("Maksimum puan")).toHaveValue("100");

  await page.getByRole("button", { name: "Yayınla" }).click();
  await page.waitForURL(new RegExp(`/egitmen/odevler/${uuidSegment}`));
  saveState({ assignmentId: idFromUrl(page.url(), "odevler") });
  await expect(page.getByText("E2E ödevi").first()).toBeVisible();
});
