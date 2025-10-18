import { test, expect } from "@playwright/test";

test.describe("Auth / Register Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should allow user to register for ${locale.toUpperCase()}`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/login`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // Navigate to Register Page if needed
      const registerButton = page.getByRole("button", { name: /sign up|register|registrieren|注册/i });
      if (await registerButton.isVisible().catch(() => false)) {
        await registerButton.click();
      }

      // Fill inputs
      const usernameInput = page.getByPlaceholder(/username/i);
      await expect(usernameInput).toBeVisible({ timeout: 20000 });
      await usernameInput.fill("testuser");

      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toBeVisible();
      await emailInput.fill("joylynmadriagats@gmail.com");

      const passwordInput = page.getByPlaceholder(/^password$/i);
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill("Password123!");

      const confirmInput = page.getByPlaceholder(/confirm/i);
      await expect(confirmInput).toBeVisible();
      await confirmInput.fill("Password123!");

      // Submit registration
      const createAccountBtn = page.getByRole("button", { name: /create account|konto erstellen|创建账户/i });
      await expect(createAccountBtn).toBeVisible();
      await createAccountBtn.click();

      // Wait for OTP modal if appears
      const otpInput = page.getByPlaceholder(/otp/i);
      if (await otpInput.isVisible().catch(() => false)) {
        await otpInput.fill("123456"); // Example OTP for testing
        const verifyBtn = page.getByRole("button", { name: /verify|验证/i });
        await verifyBtn.click();
      }

      // Confirm redirect to profile setup or landing
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(new RegExp(`/${locale}/profile-setup|/${locale}/my-room`));
    });
  }
});
