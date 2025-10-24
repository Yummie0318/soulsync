import { test, expect } from "@playwright/test";

test.describe("Profile Setup Page", () => {
  test.use({ storageState: "storage/logged-in.json" });

  test.beforeEach(async ({ page }) => {
    // Navigate to the profile setup page
    await page.goto("/en/profile-setup");
    await page.waitForLoadState("networkidle");
  });

  test("should display profile setup form", async ({ page }) => {
    // Check for page title or header
    await expect(page.getByRole("heading", { name: /profile setup/i })).toBeVisible();

    // Check that basic form fields exist
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/bio/i)).toBeVisible();

    // Optional: check for avatar upload or save button
    const avatarInput = page.locator('input[type="file"]');
    await expect(avatarInput).toBeVisible();

    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
  });

  test("should allow editing and saving profile", async ({ page }) => {
    // Fill in name and bio
    await page.getByLabel(/display name/i).fill("Joylyn");
    await page.getByLabel(/bio/i).fill("Nature lover 🌿 and forest technician.");

    // Optionally upload an avatar if field exists
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles("tests/assets/sample-avatar.jpg").catch(() => {});
    }

    // Click save and wait for success
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 10000 });
  });

  test("should show validation if required fields are empty", async ({ page }) => {
    await page.getByLabel(/display name/i).fill("");
    await page.getByRole("button", { name: /save/i }).click();

    // Expect some validation message
    await expect(page.getByText(/required/i)).toBeVisible();
  });
});
