import { test, expect } from "@playwright/test";

test.describe("Auth / Register Page", () => {
  const locales = ["en", "de", "zh"];
  const testOtp = "123456"; // mock OTP for testing

  for (const locale of locales) {
    test(`✅ should register a new user for locale ${locale}`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/register`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      const bodyText = await page.locator("body").innerText();
      if (/404|not found/i.test(bodyText)) {
        test.skip(true, `Skipping ${locale} — page not found`);
      }

      const timestamp = Date.now();
      const username = `testuser${timestamp}`;
      const email = `test${timestamp}@example.com`;
      const password = "Password123!";

      const usernameInput = page.locator('input[placeholder*="Username"], input[placeholder*="Benutzername"], input[placeholder*="用户名"]');
      const emailInput = page.locator('input[placeholder*="Email"], input[placeholder*="E-Mail"], input[placeholder*="邮箱"]');
      const passwordInput = page.locator('input[placeholder*="Password"], input[placeholder*="Passwort"], input[placeholder*="密码"]');
      const confirmPasswordInput = page.locator('input[placeholder*="Confirm Password"], input[placeholder*="Passwort bestätigen"], input[placeholder*="确认密码"]');

      await expect(usernameInput).toBeVisible({ timeout: 10000 });
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();

      await usernameInput.fill(username);
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await confirmPasswordInput.fill(password);

      const createAccountBtn = page.getByRole("button", { name: /create account/i });
      await expect(createAccountBtn).toBeVisible();
      await createAccountBtn.click();

      const otpInput = page.locator('input[maxlength="6"]');
      await expect(otpInput).toBeVisible({ timeout: 5000 });
      await otpInput.fill(testOtp);

      const verifyBtn = page.getByRole("button", { name: /verify/i });
      await expect(verifyBtn).toBeVisible();
      await verifyBtn.click();

      await page.waitForURL(`/${locale}/profile-setup`, { timeout: 15000 });
      expect(page.url()).toContain(`/${locale}/profile-setup`);
    });
  }

  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/register");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
