import { expect, login, test, visit } from "./support/helpers";
import { loadState, saveState } from "./support/state";

/** Flow 5: keyboard grading (Enter jumps to the next row), publishing scores, CSV export. */
test.describe.configure({ mode: "serial" });

test("eğitmen klavyeyle puanlar, yayınlar ve CSV indirir", async ({ page }) => {
  const { instructor, assignmentId } = loadState();
  await login(page, { kind: "staff", ...instructor! }, /\/egitmen/);
  await visit(page, `/egitmen/odevler/${assignmentId}?sekme=teslimler&filtre=all`);

  const scoreInputs = page.locator("input[data-score-index]:visible");
  await expect(scoreInputs).toHaveCount(2);
  const first = scoreInputs.nth(0);
  const second = scoreInputs.nth(1);

  const numberOf = async (input: typeof first) =>
    ((await input.getAttribute("aria-label")) ?? "").replace(/\s*puanı$/, "");
  const scores = { [await numberOf(first)]: 90, [await numberOf(second)]: 70 };

  await first.fill("90");
  await first.press("Enter");
  await expect(second).toBeFocused();
  await second.fill("70");
  await second.press("Enter");

  await expect(page.getByLabel("Kaydedildi")).toHaveCount(2);
  saveState({ scores });

  const publish = page.getByRole("button", { name: /Puanları yayınla \(2\)/ });
  await expect(publish).toBeEnabled();
  await publish.click();
  await page.getByRole("dialog").getByRole("button", { name: "Yayınla", exact: true }).click();
  await expect(page.getByText("Puanlar yayınlandı.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Puanları yayınla \(0\)/ })).toBeDisabled();

  const csv = await page.request.get(`/api/odevler/${assignmentId}/teslimler.csv`);
  expect(csv.status()).toBe(200);
  const body = await csv.body();
  expect([...body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
});
