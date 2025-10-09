import { test, expect } from "@playwright/test";

test.describe("Locale Landing Page Rendering", () => {
  // 🌍 Supported locales and expected localized texts
  const locales = [
    { code: "en", expected: "SoulSync AI" },
    { code: "de", expected: "SoulSync AI" },
    { code: "zh", expected: "SoulSync AI" },
  ];

  for (const locale of locales) {
    test(`should render ${locale.code.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale.code}/landing`;

      // Navigate to landing page
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check main header and tagline/subtitle exist
      await expect(page.locator("h1")).toHaveText(/.+/);
      await expect(page.locator("p")).toHaveText(/.+/);

      // ✅ Verify <html lang="...">
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);

      // ✅ Ensure page title does not contain 404
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain("404");

      // ✅ Check important buttons
      const getStarted = page.locator(`a[href="/${locale.code}/login/ai-drawing"]`);
      const login = page.locator(`a[href="/${locale.code}/login"]`);
      await expect(getStarted).toBeVisible();
      await expect(login).toBeVisible();
    });
  }

  // 🧪 Negative test: invalid locale should return 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/landing");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
