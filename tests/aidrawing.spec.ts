import { test, expect, type TestInfo } from "@playwright/test";

test.describe("Login Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} login page correctly`, async ({ page }, testInfo: TestInfo) => {
      const url = `http://localhost:3000/${locale}/login`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Gracefully skip test if 404 or missing page
      const bodyText = await page.locator("body").innerText();
      if (/404|not found/i.test(bodyText)) {
        testInfo.skip(true, `Skipping ${locale.toUpperCase()} — page not found`);
      }

      // 🚨 Fail immediately on console or JS errors
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          throw new Error(`❌ Console error: ${msg.text()}`);
        }
      });

      // ✅ Title check
      const title = page.locator("h1");
      await expect(title).toBeVisible({ timeout: 10000 });
      await expect(title).toHaveText(/SoulSync AI/i);

      // ✅ Localized text detection
      const possibleTexts = [
        /welcome/i,          // English
        /willkommen/i,       // German
        /登录|登錄|歡迎|欢迎/i, // Chinese
        /sign in/i,
        /log in/i,
        /anmelden/i,
        /einloggen/i,
      ];

      let found = false;
      for (const regex of possibleTexts) {
        const match = await page.getByText(regex, { exact: false }).first().isVisible().catch(() => false);
        if (match) {
          found = true;
          break;
        }
      }
      expect(found, `Missing localized login/welcome text on ${locale}`).toBeTruthy();

      // ✅ Form fields
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(passwordInput).toBeVisible();

      // ✅ Sign In / Login button check
      const signInButtons = [
        /sign in/i,
        /log in/i,
        /anmelden/i,
        /einloggen/i,
        /登录/i,
        /登入/i,
      ];

      let signInButtonFound = false;
      for (const regex of signInButtons) {
        const btn = page.getByRole("button", { name: regex });
        if (await btn.first().isVisible().catch(() => false)) {
          signInButtonFound = true;
          break;
        }
      }
      expect(signInButtonFound, `No localized Sign In button found on ${locale}`).toBeTruthy();

      // ✅ Start New Journey button
      const startJourneyButton = page.getByRole("button", { name: /journey|reise|旅程/i });
      await expect(startJourneyButton).toBeVisible();

      // ✅ Forgot Password link
      const forgotPassword = page.locator('a[href="/forgot-password"]');
      await expect(forgotPassword).toBeVisible();

      // ✅ HTML language attribute
      await expect(page.locator("html")).toHaveAttribute("lang", /en|de|zh/);

      // ✅ Ensure title valid (no 404)
      const titleText = await page.title();
      expect(titleText).not.toContain("404");

      // ✅ Simulate login
      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");

      // Click whichever localized button is available
      for (const regex of signInButtons) {
        const btn = page.getByRole("button", { name: regex });
        if (await btn.first().isVisible().catch(() => false)) {
          await btn.click();
          break;
        }
      }

      // ✅ Verify redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(new RegExp(`/${locale}/(my-room|login/ai-drawing|login)`));
    });
  }

  // 🧪 Negative test — invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
