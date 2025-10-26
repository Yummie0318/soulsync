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
  await Promise.all([page.waitForLoadState("networkidle"), button.click()]);
}

// --- Polling helper for selects ---
async function waitForSelectOptions(page: Page, selectLocator: ReturnType<Page['getByLabel']>, timeout = 20000) {
  await expect(selectLocator).toBeVisible({ timeout });
  await expect
    .poll(async () => {
      const options = await selectLocator.locator('option').count();
      return options > 1;
    }, { timeout, intervals: [500] })
    .toBe(true);
}

// --- Polling helper for file inputs ---
async function waitForFileInput(page: Page, fileInputLocator: ReturnType<Page['getByLabel']>, timeout = 20000) {
  await expect(fileInputLocator).toBeVisible({ timeout });
  await expect
    .poll(async () => {
      const disabled = await fileInputLocator.isDisabled();
      return !disabled;
    }, { timeout, intervals: [500] })
    .toBe(true);
}

// --- Test suite ---
test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile-setup");
    await page.waitForLoadState("networkidle");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select Interests ---
    console.log("🔍 Selecting interests...");
    const interestCheckboxes = page.getByRole("checkbox");
    await expect(interestCheckboxes.first()).toBeVisible({ timeout: 20000 });

    const count = await interestCheckboxes.count();
    console.log(`✅ Found ${count} interest checkboxes`);

    if (count === 0) {
      console.warn("⚠️ No interest elements found. Skipping Step 1.");
    } else {
      for (let i = 0; i < Math.min(3, count); i++) {
        const interest = interestCheckboxes.nth(i);
        await interest.scrollIntoViewIfNeeded();
        await interest.check({ force: true });
        await page.waitForTimeout(300);
      }
    }

    await clickButton(page, "Next");

    // --- Step 2: Birthdate ---
    console.log("📅 Filling birthdate...");
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("06");
    await page.getByPlaceholder("DD").fill("15");
    await clickButton(page, "Next");

    // --- Step 3: About You ---
    console.log("❤️ Waiting for About You section...");
    const aboutYouHeader = page.getByText(/about you/i);
    await expect(aboutYouHeader).toBeVisible({ timeout: 30000 });

    // Gender
    const genderSelect = page.getByLabel("Gender");
    await waitForSelectOptions(page, genderSelect);
    await genderSelect.selectOption({ label: "Male" });

    // Star Sign
    const starSignSelect = page.getByLabel("Star Sign");
    await waitForSelectOptions(page, starSignSelect);
    await starSignSelect.selectOption({ label: "♈ Aries (Mar 21 - Apr 19)" });

    // "Looking For" checkboxes
    await page.getByLabel("Female").check();
    await page.getByLabel("Friendship").check();

    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 4: Location ---
    console.log("📍 Filling location...");
    const countrySelect = page.getByLabel("Country");
    await waitForSelectOptions(page, countrySelect);
    await countrySelect.selectOption({ index: 1 });

    await page.getByLabel("City").fill("Manila");
    await page.getByLabel("Postal Code").fill("1000");
    await clickButton(page, "Next");

    // --- Step 5: Finishing Touches ---
    console.log("🎨 Uploading photo & quote...");
    const photoInput = page.getByLabel(/upload photo/i);
    await waitForFileInput(page, photoInput);
    const photoPath = "tests/fixtures/photo.png";
    await photoInput.setInputFiles(photoPath);

    const quoteInput = page.getByLabel(/Favorite Quote/i);
    await expect(quoteInput).toBeVisible({ timeout: 10000 });
    await quoteInput.fill("Keep learning every day!");

    await clickButton(page, "Finish");

    // --- Verify success ---
    console.log("✅ Verifying completion...");
    await expect(page.getByText(/profile setup complete/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/welcome to your personal room/i)).toBeVisible();
  });
});
