import { test, expect } from "@playwright/test";

test.describe("🌍 Landing Page Rendering", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`✅ Should render ${locale.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/landing`;

      console.log(`\n🌐 Visiting ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // 🚨 Catch page and console errors test
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          throw new Error(`❌ Console error: ${msg.text()}`);
        }
      });

      // ✅ Main heading and intro paragraphs
      const heading = page.locator("h1");
      await expect(heading, "Missing <h1> heading").toHaveText(/.+/, { timeout: 10000 });

      const firstParagraph = page.locator("p").first();
      await expect(firstParagraph, "Missing paragraph text").toHaveText(/.+/, { timeout: 10000 });

      // ✅ Feature cards validation
      const featureTexts = page.locator("section div p");
      const count = await featureTexts.count();
      expect(count, "No feature sections found").toBeGreaterThanOrEqual(1);

      for (let i = 0; i < count; i++) {
        const text = await featureTexts.nth(i).innerText();
        expect(text.trim().length, `Empty feature text at index ${i}`).toBeGreaterThan(0);
      }

      // ✅ CTA buttons (Get Started & Login)
      const getStarted = page.locator(`a[href="/${locale}/login/ai-drawing"]`);
      const login = page.locator(`a[href="/${locale}/login"]`);

      await expect(getStarted, "Missing Get Started button").toBeVisible({ timeout: 10000 });
      await expect(login, "Missing Login button").toBeVisible({ timeout: 10000 });

      // ✅ <html lang> check — tolerant fallback for in-progress locales
      const langAttr = await page.locator("html").getAttribute("lang");
      expect(langAttr).toBeTruthy();
      console.log(`🈶 Page <html lang> = "${langAttr}"`);

      // Warn instead of fail if mismatch (to allow partial translation support)
      if (langAttr !== locale) {
        console.warn(`⚠️ Expected lang="${locale}", but got "${langAttr}".`);
      }

      // ✅ Ensure title does not indicate 404
      const title = (await page.title()).toLowerCase();
      expect(title).not.toContain("404");

      console.log(`✅ ${locale.toUpperCase()} landing page passed successfully.`);
    });
  }

  // 🧪 Negative test: invalid locale should return 404
  test("❌ Should show 404 for invalid locale", async ({ page }) => {
    const url = "http://localhost:3000/xyz/landing";
    console.log(`\n🔎 Visiting invalid locale URL: ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    await expect(page.locator("body")).toContainText(/404|not found/i);
    console.log("✅ 404 page rendered correctly for invalid locale.");
  });
});
