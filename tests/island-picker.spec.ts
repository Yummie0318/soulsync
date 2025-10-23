// tests/island.spec.ts
import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("🏝️ Island Picker Page", () => {
  test.beforeEach(async ({ page }) => {
    const storagePath = "storage/logged-in.json";
    if (fs.existsSync(storagePath)) {
      const state = JSON.parse(fs.readFileSync(storagePath, "utf8"));
      await page.context().addCookies(state.cookies);
    } else {
      throw new Error("❌ Missing storage/logged-in.json! Run login test first.");
    }
  });

  test("should load island picker page and display content", async ({ page }) => {
    await page.goto("/en/island-picker");
    await page.waitForLoadState("networkidle");

    // ✅ Page should contain title or header
    const header = page.locator("h1");
    await expect(header).toBeVisible();

    // ✅ Either show skeleton loader or islands
    const skeletons = page.locator(".animate-pulse");
    const islands = page.locator(".aspect-square");

    if (await skeletons.count()) {
      console.log("⏳ Islands loading (skeleton visible)");
      await expect(skeletons.first()).toBeVisible();
    } else if (await islands.count()) {
      console.log("✅ Islands displayed");
      await expect(islands.first()).toBeVisible();
    } else {
      throw new Error("❌ No island elements or skeletons found");
    }
  });

  test("should handle island selection if data loaded", async ({ page }) => {
    await page.goto("/en/island-picker");
    await page.waitForLoadState("networkidle");

    const islands = page.locator(".aspect-square");
    const chooseButton = page.locator("button:has-text('Choose')");

    if (await islands.count()) {
      console.log("✅ Selecting first island...");
      await islands.first().click();
      await expect(chooseButton).toBeEnabled();

      // Mocking the click action (no real API call validation)
      await chooseButton.click();
      console.log("🏝️ Choose button clicked successfully");
    } else {
      console.log("⚠️ No islands available — skipping selection test");
    }
  });
});
