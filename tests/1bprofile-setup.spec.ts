import { test, expect } from "@playwright/test";

test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    // Go to profile setup page (authenticated session from storage)
    await page.goto("/en/profile-setup");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select interests ---
    const interests = await page.locator('input[type="checkbox"]');
    const interestCount = await interests.count();

    for (let i = 0; i < Math.min(3, interestCount); i++) {
      await interests.nth(i).check();
    }

    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 2: Enter birthdate (year only optional month/day) ---
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("06");
    await page.getByPlaceholder("DD").fill("15");

    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 3: About You ---
    // Select Gender explicitly
    await page.getByLabel("Gender").selectOption({ index: 1 }); // Male (index 1 is safe)
    
    // Select "Looking For" options (checkboxes)
    const lookingFor = page.getByLabel(/Looking For/i).locator('input[type="checkbox"]');
    const lookingCount = await lookingFor.count();
    for (let i = 0; i < Math.min(2, lookingCount); i++) {
      await lookingFor.nth(i).check();
    }

    // Select Star Sign explicitly
    await page.getByLabel("Star Sign").selectOption({ label: "Aries" });

    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 4: Location ---
    await page.getByLabel("Country").selectOption({ index: 1 }); // First country
    await page.getByPlaceholder("City").fill("Manila");
    await page.getByPlaceholder("Postal Code (required)").fill("1000");

    await page.getByRole("button", { name: /Next/i }).click();

    // --- Step 5: Finishing Touches ---
    const photoPath = "tests/fixtures/photo.png"; // make sure this exists
    await page.getByLabel("Upload Photo").setInputFiles(photoPath);
    await page.getByLabel("Favorite Quote").fill("Keep learning every day!");
    
    await page.getByRole("button", { name: /Finish/i }).click();

    // --- Assert final success message ---
    await expect(page.locator('text=Profile setup complete!')).toBeVisible();
    await expect(page.locator('text=Welcome to your personal room!')).toBeVisible();
  });
});
