// tests/following.spec.ts
import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("👥 Following Page", () => {
  test.beforeEach(async ({ page }) => {
    // ✅ Load storage state from saved login
    const storagePath = "storage/logged-in.json";
    if (fs.existsSync(storagePath)) {
      await page.context().addCookies(JSON.parse(fs.readFileSync(storagePath, "utf8")).cookies);
    } else {
      throw new Error("❌ Missing storage/logged-in.json! Run 1login.spec.ts first.");
    }
  });

  test("should load following page successfully", async ({ page }) => {
    await page.goto("/en/following");

    await page.waitForLoadState("networkidle");

    // Check if page title or header is visible
    const header = page.locator("h1");
    await expect(header).toBeVisible();

    // Check if the search input exists
    const searchInput = page.locator('input[placeholder]');
    await expect(searchInput).toBeVisible();

    // Validate the main content (cards or empty message)
    const noFollowing = page.locator("text=/no following/i");
    const cards = page.locator(".bg-white\\/10");

    if (await noFollowing.count()) {
      await expect(noFollowing).toBeVisible();
    } else {
      await expect(cards.first()).toBeVisible();
    }
  });

  test("should open and close image preview if available", async ({ page }) => {
    await page.goto("/en/following");
    await page.waitForLoadState("networkidle");

    const firstImage = page.locator("img").first();
    if (await firstImage.isVisible()) {
      await firstImage.click();
      const preview = page.locator("img[alt='Preview']");
      await expect(preview).toBeVisible();
      await page.mouse.click(10, 10); // click outside to close
      await expect(preview).toBeHidden();
    } else {
      console.log("⚠️ No images found, skipping preview test");
    }
  });
});
