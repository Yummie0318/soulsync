import { test, expect } from "@playwright/test";

test.describe("Profile Setup - Step 1 Interests", () => {
  test("should load and allow selecting 3 interests", async ({ page }) => {
    // Navigate to the profile setup page (English locale example)
    await page.goto("/en/profile-setup");

    // Wait for the interest buttons to appear
    const interestButtons = page.locator("button", { hasText: /.*/ });

    // Wait until at least 3 buttons are rendered
    await expect(interestButtons.first()).toBeVisible({ timeout: 10000 });

    // Log count for debugging
    const count = await interestButtons.count();
    console.log("✅ Interest buttons loaded:", count);
    expect(count).toBeGreaterThan(0);

    // Click first 3 interests
    for (let i = 0; i < 3; i++) {
      await interestButtons.nth(i).click();
    }

    // Ensure the selection counter updates (e.g., "3 / 3 minimum")
    await expect(page.locator("text=/3\\s*\\/\\s*3/")).toBeVisible();

    // The "Next" button should now be enabled
    const nextButton = page.locator("button", { hasText: "Next" });
    await expect(nextButton).toBeEnabled();

    // Click Next
    await nextButton.click();

    // Verify we moved to Step 2 (check for Birthdate input)
    await expect(page.locator("input[placeholder='Year']")).toBeVisible();
  });
});
