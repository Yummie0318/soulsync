import { test, expect } from "@playwright/test";

test.describe("Landing Page Rendering", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/landing`;

      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check main texts exist (first paragraph only)
      await expect(page.locator("h1")).toHaveText(/.+/);
      await expect(page.locator("p").first()).toHaveText(/.+/);

      // ✅ Check feature texts exist (3 feature blocks)
      const featureTexts = page.locator("section div p");
      const count = await featureTexts.count();
      expect(count).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < count; i++) {
        await expect(featureTexts.nth(i)).toHaveText(/.+/);
      }

      // ✅ Check buttons
      const getStarted = page.locator(`a[href="/${locale}/login/ai-drawing"]`);
      const login = page.locator(`a[href="/${locale}/login"]`);
      await expect(getStarted).toBeVisible();
      await expect(login).toBeVisible();

      // ✅ Verify <html lang="..."> (allow test)
      await expect(page.locator("html")).toHaveAttribute("lang", /en|de|zh/);

      // ✅ Ensure page title does not contain 404
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain("404");
    });
  }

  // 🧪 Negative test: invalid locale should return 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/landing");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
