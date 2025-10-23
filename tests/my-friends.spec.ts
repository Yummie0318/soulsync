import { test, expect } from "@playwright/test";

test.describe("🧑‍🤝‍🧑 My Friends Page Tests", () => {
  test.use({
    storageState: "storage/logged-in.json",
    baseURL: "http://localhost:3000",
  });

  test("Load My Friends page and test Follow / Unfriend flow", async ({ page }) => {
    console.log("➡️ Navigating to My Friends page...");

    // Go to your myfriends route (auto detects locale)
    await page.goto("/en/myfriends", { waitUntil: "networkidle" });

    // Verify page loaded
    await expect(page.locator("h1")).toContainText("My Friends", {
      timeout: 10000,
    });
    console.log("✅ My Friends page loaded");

    // Wait for either skeleton or friends grid
    await page.waitForSelector("main");

    // Screenshot initial state
    await page.screenshot({ path: "playwright-report/myfriends_initial.png" });

    // Try opening search
    const searchButton = page.locator('button[aria-label="Open search"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      console.log("🔍 Search panel opened");

      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill("test");
      await page.waitForTimeout(1000);

      // Try clicking Follow button if visible
      const followBtn = page.locator('button:has-text("Follow")').first();
      if (await followBtn.isVisible()) {
        await followBtn.click();
        console.log("✅ Follow button clicked");
        await page.waitForTimeout(1000);
      } else {
        console.log("ℹ️ No followable user found");
      }

      // Close search
      const closeBtn = page.locator('button[aria-label="Close search"]');
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      console.log("⚠️ Search button not found");
    }

    // Try to unfriend someone
    const unfriendBtn = page.locator('button:has-text("Unfriend")').first();
    if (await unfriendBtn.isVisible()) {
      await unfriendBtn.click();
      console.log("🧾 Unfriend dialog opened");
      const confirmBtn = page.locator('button:has-text("Unfriend")').last();
      await confirmBtn.click({ timeout: 5000 });
      console.log("✅ Unfriend confirmed");
    } else {
      console.log("ℹ️ No friend found to unfriend");
    }

    // Take final screenshot
    await page.screenshot({ path: "playwright-report/myfriends_final.png" });

    console.log("🎉 My Friends test completed successfully");
  });
});
