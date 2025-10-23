// tests/myfriends.spec.ts
import { test, expect } from "@playwright/test";

test.describe("🧑‍🤝‍🧑 MyFriends Page", () => {
  test.use({ storageState: "storage/logged-in.json" });

  test("Load My Friends page and verify UI interactions", async ({ page }) => {
    console.log("🌐 Navigating to MyFriends page...");
    await page.goto("/en/myfriends");
    await page.waitForLoadState("networkidle");

    // 1️⃣ Verify title
    await expect(page.locator("h1")).toContainText(/My Friends/i);

    // 2️⃣ Verify friends list or empty state
    const hasFriends = await page.locator("text=Unfriend").count();
    if (hasFriends > 0) {
      console.log("✅ Friends list loaded");
    } else {
      await expect(page.locator("text=No friends")).toBeVisible();
      console.log("ℹ️ No friends found (empty state)");
    }

    // 3️⃣ Toggle Search
    const searchButton = page.locator('button[aria-label*="search"]');
    await searchButton.click();
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // 4️⃣ Type in search box
    const input = page.locator('input[placeholder*="Search"]');
    await input.fill("test");
    await page.waitForTimeout(1000); // allow debounce + fetch
    const resultCount = await page.locator("text=Follow").count();
    console.log(`🔎 Found ${resultCount} search results`);

    // 5️⃣ Close search panel
    await searchButton.click();
    await expect(page.locator('input[placeholder*="Search"]')).toBeHidden();

    // 6️⃣ Test unfriend confirm dialog (if any friend exists)
    if (hasFriends > 0) {
      const unfriendBtn = page.locator("text=Unfriend").first();
      await unfriendBtn.click();

      await expect(page.locator("text=Are you sure")).toBeVisible();
      console.log("⚠️ Confirm dialog opened");

      const cancelBtn = page.locator("text=Cancel");
      await cancelBtn.click();
      await expect(page.locator("text=Are you sure")).toBeHidden();
      console.log("✅ Confirm dialog closed");
    }

    console.log("🎉 MyFriends page test completed!");
  });
});
