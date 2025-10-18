import { test, expect } from "@playwright/test";

test.describe("Tree Quiz Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} Tree Quiz correctly`, async ({ page }) => {
      // ✅ Correct URL (not /my-messages/call)
      const url = `http://localhost:3000/${locale}/login/tree-quiz`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // 🚨 Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Verify title and subtitle exist
      const title = page.locator("h1");
      const subtitle = page.locator("p").first();
      await expect(title).toHaveText(/.+/);
      await expect(subtitle).toHaveText(/.+/);

      // ✅ Verify tree buttons (🌲 🌳 🌴 🌸)
      const trees = ["🌲", "🌳", "🌴", "🌸"];
      for (const emoji of trees) {
        await expect(page.getByText(emoji)).toBeVisible();
      }

      // ✅ Verify there are 4 tree option buttons
      const buttons = page.locator("button");
      await expect(buttons).toHaveCount(4);

      // ✅ Verify each label under emoji has text
      for (let i = 0; i < 4; i++) {
        const label = buttons.nth(i).locator("p");
        await expect(label).toHaveText(/.+/);
      }

      // ✅ Check background glow elements
      const bgGlows = page.locator("div.bg-pink-600\\/30, div.bg-purple-600\\/30");
      expect(await bgGlows.count()).toBeGreaterThanOrEqual(1);

      // ✅ Click one tree button
      await buttons.nth(0).click();
      await page.waitForLoadState("networkidle");

      // ✅ Expect redirect to feelings-quiz
      expect(page.url()).toContain(`/${locale}/login/feelings-quiz`);
    });
  }

  // 🧪 Negative test: invalid locale should show 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login/tree-quiz");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
