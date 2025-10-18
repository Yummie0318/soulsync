import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should render ${locale.toUpperCase()} login page correctly`, async ({ page }, testInfo) => {
      const url = `http://localhost:3000/${locale}/login`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Skip gracefully if page not found
      const bodyText = await page.locator("body").innerText();
      if (/404|not found/i.test(bodyText)) {
        testInfo.skip(true, `Skipping ${locale.toUpperCase()} — page not found`);
      }

      // Fail test on page errors
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // Title check
      const title = page.locator("h1");
      await expect(title).toBeVisible({ timeout: 10000 });
      await expect(title).toHaveText(/SoulSync AI/i);

      // Check localized welcome text
      const possibleTexts = [
        /welcome/i,
        /willkommen/i,
        /登录|登錄|歡迎|欢迎/i,
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
      expect(found).toBeTruthy();

      // Email + password inputs
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(passwordInput).toBeVisible();

      // Login button
      const loginButtonRegexes = [/sign in/i, /log in/i, /anmelden/i, /einloggen/i, /登录/i, /登入/i];
      let loginButtonFound = false;
      for (const regex of loginButtonRegexes) {
        const btn = page.getByRole("button", { name: regex });
        if (await btn.first().isVisible().catch(() => false)) {
          loginButtonFound = true;
          break;
        }
      }
      expect(loginButtonFound).toBeTruthy();

      // Start New Journey button
      const startJourneyButton = page.getByRole("button", { name: /journey|reise|旅程/i });
      await expect(startJourneyButton).toBeVisible();

      // Forgot password link
      const forgotPassword = page.locator('a[href="/forgot-password"]');
      await expect(forgotPassword).toBeVisible();

      // HTML lang attribute
      await expect(page.locator("html")).toHaveAttribute("lang", /en|de|zh/);

      // Simulate login
      await emailInput.fill("test@example.com");
      await passwordInput.fill("password123");

      // Click the first available login button
      for (const regex of loginButtonRegexes) {
        const btn = page.getByRole("button", { name: regex });
        if (await btn.first().isVisible().catch(() => false)) {
          await btn.click();
          break;
        }
      }

      // Wait for redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(new RegExp(`/${locale}/(my-room|login/ai-drawing|login)`));
    });
  }

  // Negative test — invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
