import { test, expect } from "@playwright/test";

test.describe("Landing Page Rendering", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`🌐 Should render ${locale.toUpperCase()} landing page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/landing`;

      console.log(`Visiting ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });

      // 🚨 Immediately fail on page or console errors
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          throw new Error(`❌ Console error: ${msg.text()}`);
        }
      });

      // ✅ Check main texts exist
      const heading = page.locator("h1");
      await expect(heading).toHaveText(/.+/, { timeout: 10000 });

      const firstParagraph = page.locator("p").first();
      await expect(firstParagraph).toHaveText(/.+/, { timeout: 10000 });

      // ✅ Check features (at least 1 visible)
      const featureTexts = page.locator("section div p");
      const count = await featureTexts.count();
      expect(count).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < count; i++) {
        const text = await featureTexts.nth(i).innerText();
        expect(text.trim().length).toBeGreaterThan(0);
      }

      // ✅ Check buttons (ensure visibility)
      const getStarted = page.locator(`a[href="/${locale}/login/ai-drawing"]`);
      const login = page.locator(`a[href="/${locale}/login"]`);

      await expect(getStarted, "Get Started button missing").toBeVisible({ timeout: 10000 });
      await expect(login, "Login button missing").toBeVisible({ timeout: 10000 });

      // ✅ Verify <html lang="..."> tag
      await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(locale));

      // ✅ Ensure title valid (no 404)
      const title = await page.title();
      expect(title.toLowerCase()).not.toContain("404");

      console.log(`✅ ${locale.toUpperCase()} landing page passed.`);
    });
  }

  // 🧪 Negative test: invalid locale should return 404
  test("❌ Should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/landing", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
