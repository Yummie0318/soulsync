import { test, expect } from "@playwright/test";

test.describe("Locale Landing Page Rendering", () => {
  // 🌍 List of supported locales and expected localized texts
  const locales = [
    { code: "en", expected: "SoulSync AI" },
    { code: "de", expected: "SoulSync AI" },
    { code: "zh", expected: "SoulSync AI" }, // update if different
  ];

  for (const locale of locales) {
    test(`should render ${locale.code.toUpperCase()} landing page correctly`, async ({ page }) => {
      // 🧭 Navigate to locale landing page
      const url = `http://localhost:3000/${locale.code}/landing`;
      await page.goto(url);

      // 🕐 Wait for the page to fully load
      await page.waitForLoadState("domcontentloaded");

      // 🚨 Fail the test if there are any console errors (like ChunkLoadError)
      page.on("pageerror", (err) => {
        throw new Error(`Page error detected: ${err.message}`);
      });

      // ✅ Expect the localized text from the messages file to appear
      await expect(page.locator("body")).toContainText(locale.expected);

      // 🈶 Optional: Verify that the <html lang="..."> attribute matches
      const htmlLang = await page.getAttribute("html", "lang");
      expect(htmlLang).toBe(locale.code);

      // 🚫 Confirm that the page didn’t go to 404 or crash
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain("404");

      console.log(`✅ ${locale.code.toUpperCase()} locale passed: ${url}`);
    });
  }

  // 🧪 Negative test: invalid locale should show 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/landing");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
