// 📁 C:\Users\Ideapad Gaming 3\Desktop\soulsync-lates clone\tests\view-profile.spec.ts
import { test, expect } from "@playwright/test";

test.describe("👤 View Profile Page Tests", () => {
  test.use({
    storageState: "storage/logged-in.json",
    baseURL: "http://localhost:3000",
  });

  test("Load specific profile and verify user info / unfriend flow", async ({ page }) => {
    console.log("➡️ Navigating to View Profile page...");

    // Visit the given profile
    await page.goto("/en/view-profile/114", { waitUntil: "networkidle" });

    // ✅ Verify profile name or header is visible
    const profileHeader = page.locator("h1, h2, [data-testid='profile-name']");
    await expect(profileHeader).toBeVisible({ timeout: 10000 });
    console.log("✅ Profile header visible");

    // Wait for the main content
    await page.waitForSelector("main, section", { timeout: 10000 });

    // Screenshot before interactions
    await page.screenshot({ path: "playwright-report/viewprofile_initial.png" });

    // 🧾 Try to unfriend if button exists
    const unfriendBtn = page.locator('button:has-text("Unfriend")').first();
    if (await unfriendBtn.isVisible()) {
      console.log("🧾 Unfriend button found, proceeding to unfriend...");

      await unfriendBtn.click();
      console.log("🧾 Unfriend dialog opened");

      const confirmBtn = page.locator('button:has-text("Unfriend")').last();
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();

      console.log("✅ Unfriend confirmed — verifying state change...");

      // ✅ Assertion: Wait for button state to update (should become "Follow" again)
      const followBtn = page.locator('button:has-text("Follow")').first();
      await expect(followBtn).toBeVisible({ timeout: 8000 });

      console.log("🎯 Assertion passed: 'Unfriend' changed to 'Follow' successfully");
    } else {
      console.log("ℹ️ No 'Unfriend' button found — skipping unfriend test");
    }

    // Optional: check avatar visibility
    const avatar = page.locator("img[alt*='profile'], img[alt*='avatar']");
    if (await avatar.isVisible()) console.log("🖼️ Profile avatar visible");

    // Screenshot after test
    await page.screenshot({ path: "playwright-report/viewprofile_final.png" });

    console.log("🎉 View Profile test completed successfully");
  });
});
