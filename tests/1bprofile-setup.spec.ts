import { test, expect, Page, Locator } from "@playwright/test";

// --- Helper functions ---
async function waitForButtonEnabled(page: Page, name: string, timeout = 20000) {
  const button = page.getByRole("button", { name: new RegExp(name, "i") }).first();
  await button.waitFor({ state: "visible" });

  await expect
    .poll(async () => await button.isEnabled(), {
      message: `Waiting for "${name}" button to be enabled`,
      timeout,
      intervals: [500],
    })
    .toBe(true);

  return button;
}

async function clickButton(page: Page, name: string) {
  const button = await waitForButtonEnabled(page, name);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    button.click(),
  ]);
}

async function selectCheckboxes(locator: Locator, count: number) {
  const total = await locator.count();
  for (let i = 0; i < Math.min(count, total); i++) {
    const box = locator.nth(i);
    if (!(await box.isChecked())) await box.check({ force: true });
  }
}

// --- Test suite ---
test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile-setup");
    await page.waitForLoadState("networkidle");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select interests ---
    const interests = page.locator('input[type="checkbox"]');
    await interests.first().waitFor({ state: "attached" });
    await selectCheckboxes(interests, 3);
    await page.waitForTimeout(500); // allow validation to react
    await clickButton(page, "Next");

    // --- Step 2: Enter birthdate ---
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("06");
    await page.getByPlaceholder("DD").fill("15");
    await page.waitForTimeout(300);
    await clickButton(page, "Next");

    // --- Step 3: About You ---
    await page.getByLabel("Gender").selectOption({ index: 1 });

    const lookingFor = page.getByLabel(/Looking For/i).locator('input[type="checkbox"]');
    await selectCheckboxes(lookingFor, 2);

    await page.getByLabel("Star Sign").selectOption({ label: "Aries" });

    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 4: Location ---
    await page.getByLabel("Country").selectOption({ index: 1 });
    await page.getByPlaceholder("City").fill("Manila");
    await page.getByPlaceholder("Postal Code (required)").fill("1000");
    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 5: Finishing Touches ---
    const photoPath = "tests/fixtures/photo.png";
    await page.getByLabel("Upload Photo").setInputFiles(photoPath);
    await page.getByLabel("Favorite Quote").fill("Keep learning every day!");
    await page.waitForTimeout(800);
    await clickButton(page, "Finish");

    // --- Assert final success message ---
    await expect(page.locator("text=Profile setup complete!")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Welcome to your personal room!")).toBeVisible();
  });
});
