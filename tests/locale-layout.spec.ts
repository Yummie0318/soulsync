import { test, expect } from "@playwright/test";

// 🎯 Configure Playwright to capture traces and screenshots on failure
test.use({
  trace: "retain-on-failure",       // Capture trace only for failing tests
  screenshot: "only-on-failure",    // Capture screenshot only for failing tests
  video: "retain-on-failure",       // Optional: record video on failure for extra clarity
});

test.describe("Locale Landing Page Rendering", () => {
  // 🌍 List of supported locales and expected localized texts
  const locales = [
    { code: "en", expected: "SoulSync AI" },
    { code: "de", expected: "SoulSync AI" },
    { code: "zh", expected: "SoulSync AI" }, // Update if different
  ];

  for (const locale of locales) {
    test(`should render ${locale.code.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale.code}/landing`;

      // Navigate to the landing page
      await page.goto(url);

      // Wait until DOM is fully loaded
      await page.waitForLoadState("domcontentloaded");

      // Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check that localized text appears
      await expect(page.locator("body")).toContainText(locale.expected);

      // 🈶 Verify <html lang="..."> attribute
      const htmlLang = await page.getAttribute("html", "lang");
      expect(htmlLang).toBe(locale.code);

      // 🚫 Confirm page didn’t go to 404
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain("404");

      console.log(`✅ Locale ${locale.code.toUpperCase()} passed: ${url}`);
    });
  }

  // 🧪 Negative test: invalid locale should return 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/landing");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
