import { test, expect } from "@playwright/test";

test.describe("Auth / Register Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should allow user to register for ${locale.toUpperCase()}`, async ({ page }, testInfo) => {
      const url = `http://localhost:3000/${locale}/login/auth`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // Ignore 401 or missing translation errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (!/401|MISSING_MESSAGE/.test(text)) {
            console.warn("Console error:", text);
          }
        }
      });

      // Fail test on page errors
      page.on("pageerror", (err) => {
        throw new Error(`❌ Page error detected: ${err.message}`);
      });

      // ✅ Check main heading exists
      const heading = page.locator("h1");
      await expect(heading).toBeVisible({ timeout: 10000 });

      // ✅ Fill registration form
      await page.fill('input[placeholder*="username"]', "testuser");
      await page.fill('input[placeholder*="email"]', "testuser@example.com");
      await page.fill('input[placeholder*="password"]', "Password123!");
      await page.fill('input[placeholder*="confirm"]', "Password123!");

      // ✅ Submit form
      const createButton = page.getByRole("button", { name: /create/i });
      await expect(createButton).toBeVisible();
      await createButton.click();

      // ✅ Wait for OTP modal
      const otpModal = page.locator("h2:has-text('Enter OTP')");
      await expect(otpModal).toBeVisible({ timeout: 10000 });

      // ✅ Fill OTP (dummy) and verify
      await page.fill('input[maxlength="6"]', "123456");
      const verifyButton = page.getByRole("button", { name: /verify/i });
      await expect(verifyButton).toBeVisible();
      await verifyButton.click();

      // ✅ Wait for redirect to profile-setup
      await page.waitForURL(`**/${locale}/profile-setup`, { timeout: 20000 });

      // ✅ Verify profile-setup page heading exists
      const profileHeader = page.locator("h1");
      await expect(profileHeader).toBeVisible({ timeout: 10000 });

      console.log(`✅ Registration flow passed for locale: ${locale}`);
    });
  }

  // 🧪 Negative test: invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login/auth");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
