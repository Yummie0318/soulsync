import { test, expect } from "@playwright/test";

test.describe("Feelings Quiz Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} Feelings Quiz correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/login/feelings-quiz`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // 🚨 Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Verify title and subtitle
      const title = page.locator("h1");
      const subtitle = page.locator("p").first();
      await expect(title).toHaveText(/.+/);
      await expect(subtitle).toHaveText(/.+/);

      // ✅ Verify feelings buttons (😊 😟 😌 😍)
      const feelings = ["😊", "😟", "😌", "😍"];
      for (const emoji of feelings) {
        await expect(page.getByText(emoji)).toBeVisible();
      }

      // ✅ Verify there are 4 feeling option buttons
      const buttons = page.locator("button");
      await expect(buttons).toHaveCount(4);

      // ✅ Verify feelings labels have text
      for (let i = 0; i < 4; i++) {
        const label = buttons.nth(i).locator("p");
        await expect(label).toHaveText(/.+/);
      }

      // ✅ Check background elements exist (visual sanity)
      const bgGlows = page.locator("div.bg-pink-600\\/30, div.bg-purple-600\\/30");
      expect(await bgGlows.count()).toBeGreaterThanOrEqual(1);

      // ✅ Click one feeling and verify redirect
      await buttons.nth(0).click(); // click first feeling
      await page.waitForLoadState("networkidle");

      // Expect redirect to journey-begin
      expect(page.url()).toContain(`/${locale}/login/journey-begin`);
    });
  }

  // 🧪 Negative test: invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login/feelings-quiz");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
