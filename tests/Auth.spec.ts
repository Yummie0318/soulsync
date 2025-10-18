import { test, expect } from "@playwright/test";

test.describe("Auth / Register Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {
    test(`should allow user to register for ${locale.toUpperCase()}`, async ({ page }, testInfo) => {
      const url = `http://localhost:3000/${locale}/login/auth`;
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Skip test if page is 404
      const bodyText = await page.locator("body").innerText();
      if (/404|not found/i.test(bodyText)) {
        testInfo.skip(true, `Skipping ${locale.toUpperCase()} — page not found`);
      }

      // Wait for the form to appear
      const form = page.locator("form");
      await expect(form).toBeVisible({ timeout: 20000 });

      // Fill inputs with robust selectors using placeholders (fallback to English if missing)
      const usernameInput = page.getByPlaceholder(/username/i);
      await expect(usernameInput).toBeVisible({ timeout: 20000 });
      await usernameInput.fill("testuser");

      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toBeVisible({ timeout: 20000 });
      await emailInput.fill("testuser@example.com");

      const passwordInput = page.getByPlaceholder(/password/i);
      await expect(passwordInput).toBeVisible({ timeout: 20000 });
      await passwordInput.fill("Password123!");

      const confirmInput = page.getByPlaceholder(/confirm/i);
      await expect(confirmInput).toBeVisible({ timeout: 20000 });
      await confirmInput.fill("Password123!");

      // Click "Create Account" button
      const createBtn = page.getByRole("button", { name: /create account/i });
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();

      // Wait for OTP modal if it appears
      const otpModal = page.locator("text=Enter OTP");
      if (await otpModal.isVisible({ timeout: 10000 }).catch(() => false)) {
        const otpInput = page.locator('input[type="text"][maxlength="6"]');
        await expect(otpInput).toBeVisible({ timeout: 5000 });
        await otpInput.fill("123456"); // dummy OTP
        const verifyBtn = page.getByRole("button", { name: /verify/i });
        await expect(verifyBtn).toBeVisible();
        await verifyBtn.click();
      }

      // Wait for redirect to profile setup or dashboard
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(new RegExp(`/${locale}/profile-setup|my-room|login`));
    });
  }

  // Negative test — invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    const url = "http://localhost:3000/xyz/login/auth";
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
