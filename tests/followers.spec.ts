import { test, expect } from "@playwright/test";

test.describe("Followers Page", () => {
  test.beforeEach(async ({ page }) => {
    // Go to followers page (authenticated session from storage/logged-in.json)
    await page.goto("/en/followers");

    // Wait until the loading state finishes (followers loaded)
    await page.waitForLoadState("networkidle");
  });

  test("should display followers list", async ({ page }) => {
    // Check for followers title and grid presence
    await expect(page.getByRole("heading", { name: /followers/i })).toBeVisible();

    // You can assert at least one follower card appears
    const cards = page.locator(".rounded-2xl");
    await expect(cards.first()).toBeVisible();
  });

  test("should allow searching for a follower", async ({ page }) => {
    const searchInput = page.locator("input[type='text']");
    await searchInput.fill("Bob");

    // Verify filtered follower appears or "no followers" message
    const hasResult = await page
      .getByText("Bob", { exact: false })
      .isVisible()
      .catch(() => false);

    if (hasResult) {
      await expect(page.getByText("Bob", { exact: false })).toBeVisible();
    } else {
      await expect(page.getByText(/no followers/i)).toBeVisible();
    }
  });

  test("should open image preview when clicking on a follower image", async ({ page }) => {
    const firstImage = page.locator("img").first();
    await firstImage.click();

    // Image preview modal should appear
    const preview = page.locator("div.fixed.inset-0");
    await expect(preview).toBeVisible();

    // Close preview
    await page.mouse.click(10, 10); // click outside
    await expect(preview).toBeHidden();
  });

  test("should open and close confirm dialog on remove", async ({ page }) => {
    // Try to click a visible remove button (if available)
    const removeBtn = page.locator("button", { hasText: /remove/i }).first();
    const hasButton = await removeBtn.isVisible().catch(() => false);
    if (!hasButton) {
      test.skip(true, "No removable follower available");
    }

    await removeBtn.click();

    // Confirm dialog should appear
    await expect(page.getByText(/are you sure/i)).toBeVisible();

    // Cancel first
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    await cancelBtn.click();

    await expect(page.getByText(/are you sure/i)).toBeHidden();
  });
});
