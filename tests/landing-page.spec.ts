import { test, expect } from "@playwright/test";

// 🎯 All trace, screenshot, video settings are already in playwright.config.ts
// No need to redefine them here unless overriding for this spec

test.describe("Landing Page Rendering", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/landing`;

      // Navigate to landing page
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check main texts exist
      await expect(page.locator("h1")).toHaveText(/.+/); // welcome
      await expect(page.locator("p")).toHaveText(/.+/);  // tagline or subtitle

      // ✅ Check feature texts exist (section with 3 feature blocks)
      const featureTexts = page.locator("section div p");
      await expect(featureTexts).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await expect(featureTexts.nth(i)).toHaveText(/.+/);
      }

      // ✅ Check buttons
      const getStarted = page.locator(`a[href="/${locale}/login/ai-drawing"]`);
      const login = page.locator(`a[href="/${locale}/login"]`);
      await expect(getStarted).toBeVisible();
      await expect(login).toBeVisible();

      // ✅ Verify <html lang="...">
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

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
