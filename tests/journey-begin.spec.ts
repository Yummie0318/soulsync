// C:\Users\Ideapad Gaming 3\Desktop\soulsync\tests\journey-begin.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Journey Begin Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} journey-begin page correctly`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/login/journey-begin`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Fail test immediately if console errors occur
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check if the Play icon is visible
      const playIcon = page.locator("svg");
      await expect(playIcon.first()).toBeVisible();

      // ✅ Title lines should exist and contain text
      const title = page.locator("h1");
      await expect(title).toBeVisible();
      await expect(title).toHaveText(/.+/);

      // ✅ Subtitle should be visible and not empty
      const subtitle = page.locator("p").first();
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toHaveText(/.+/);

      // ✅ CTA button should be visible and clickable
      const ctaButton = page.locator("button");
      await expect(ctaButton).toBeVisible();
      await expect(ctaButton).toHaveText(/.+/);

      // ✅ Footer text (footerPrompt)
      const footer = page.locator("text=/./", { hasText: /.+/ });
      await expect(footer.last()).toBeVisible();

      // ✅ Language attribute check
      await expect(page.locator("html")).toHaveAttribute("lang", /en|de|zh/);

      // ✅ Ensure page title does not contain 404
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain("404");

      // 🧭 Click test: Should navigate to /login/auth
      await ctaButton.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(new RegExp(`/${locale}/login/auth`));
    });
  }

  // 🧪 Negative test: invalid locale should show 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login/journey-begin");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
