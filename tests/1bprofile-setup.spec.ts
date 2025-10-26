import { test, expect, Page, Locator } from "@playwright/test";

// --- Helper functions ---
async function clickNext(page: Page) {
  // Select only your app’s Next button (ignore Next.js DevTools)
  const button = page.locator('button:has-text("Next")').first();

  // Wait for it to be visible and enabled
  await expect(button).toBeVisible({ timeout: 10000 });
  await expect(button).toBeEnabled({ timeout: 10000 });

  // Click and wait for the next question/step to appear
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.waitForTimeout(500), // slight delay to allow transition
    button.click(),
  ]);
}

async function clickFinish(page: Page) {
  const button = page.locator('button:has-text("Finish")').first();
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    button.click(),
  ]);
}

async function selectCheckboxes(locator: Locator, count: number) {
  const total = await locator.count();
  for (let i = 0; i < Math.min(count, total); i++) {
    await locator.nth(i).check();
  }
}

// --- Test suite ---
test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile-setup");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select interests ---
    const interests = page.locator('input[type="checkbox"]');
    await selectCheckboxes(interests, 3);
    await clickNext(page);

    // --- Step 2: Enter birthdate ---
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("06");
    await page.getByPlaceholder("DD").fill("15");
    await clickNext(page);

    // --- Step 3: About You ---
    await page.getByLabel("Gender").selectOption({ index: 1 });
    const lookingFor = page.getByLabel(/Looking For/i).locator('input[type="checkbox"]');
    await selectCheckboxes(lookingFor, 2);
    await page.getByLabel("Star Sign").selectOption({ label: "Aries" });
    await clickNext(page);

    // --- Step 4: Location ---
    await page.getByLabel("Country").selectOption({ index: 1 });
    await page.getByPlaceholder("City").fill("Manila");
    await page.getByPlaceholder("Postal Code (required)").fill("1000");
    await clickNext(page);

    // --- Step 5: Finishing Touches ---
    const photoPath = "tests/fixtures/photo.png";
    await page.getByLabel("Upload Photo").setInputFiles(photoPath);
    await page.getByLabel("Favorite Quote").fill("Keep learning every day!");
    await clickFinish(page);

    // --- Assert final success message ---
    await expect(page.getByText("Profile setup complete!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Welcome to your personal room!")).toBeVisible();
  });
});
