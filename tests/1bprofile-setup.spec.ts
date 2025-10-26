import { test, expect, Page } from "@playwright/test";

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

// --- Test suite ---
test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile-setup");
    await page.waitForLoadState("networkidle");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select Interests ---
    console.log("🔍 Waiting for interest elements...");

    // Try multiple patterns: button, checkbox, or selectable div
    let interests = page.locator('button, input[type="checkbox"], [role="button"]');

    await expect(interests.first()).toBeVisible({ timeout: 20000 });
    const count = await interests.count();
    console.log(`✅ Found ${count} possible interest elements`);

    if (count === 0) throw new Error("No interest elements found on Step 1!");

    for (let i = 0; i < Math.min(3, count); i++) {
      const interest = interests.nth(i);
      await interest.scrollIntoViewIfNeeded();
      await interest.click({ force: true });
      await page.waitForTimeout(300);
    }

    await clickButton(page, "Next");

    // --- Step 2: Enter Birthdate ---
    await page.getByPlaceholder(/year/i).fill("1995");
    await page.getByPlaceholder(/month/i).fill("06");
    await page.getByPlaceholder(/day/i).fill("15");
    await page.waitForTimeout(300);
    await clickButton(page, "Next");

    // --- Step 3: About You ---
    await page.getByLabel(/gender/i).selectOption({ index: 1 });

    // "Looking For" — toggle buttons or checkboxes
    const lookingFor = page.locator('input[type="checkbox"], [role="button"]');
    const lfCount = await lookingFor.count();
    console.log(`⚙️ Found ${lfCount} looking-for options`);
    for (let i = 0; i < Math.min(2, lfCount); i++) {
      const option = lookingFor.nth(i);
      await option.scrollIntoViewIfNeeded();
      await option.click({ force: true });
      await page.waitForTimeout(200);
    }

    await page.getByLabel(/star sign/i).selectOption({ label: "Aries" });
    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 4: Location ---
    await page.getByLabel(/country/i).selectOption({ index: 1 });
    await page.getByPlaceholder(/city/i).fill("Manila");
    await page.getByPlaceholder(/postal/i).fill("1000");
    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 5: Finishing Touches ---
    const photoPath = "tests/fixtures/photo.png";
    await page.getByLabel(/upload photo/i).setInputFiles(photoPath);
    await page.getByPlaceholder(/favorite quote/i).fill("Keep learning every day!");
    await page.waitForTimeout(800);
    await clickButton(page, "Finish");

    // --- Assert success message ---
    await expect(page.getByText(/profile setup complete/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/welcome to your personal room/i)).toBeVisible();
  });
});
