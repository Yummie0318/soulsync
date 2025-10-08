import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Create timestamped screenshot folder
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const screenshotsDir = path.join(__dirname, `../screenshots-${timestamp}`);
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

// ✅ Load credentials
const EMAIL = process.env.TEST_EMAIL || '';
const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('SoulSync AI Login Page', () => {
  // Skip if credentials are missing
  test.beforeAll(() => {
    if (!EMAIL || !PASSWORD) {
      test.skip(true, 'Missing TEST_EMAIL or TEST_PASSWORD in .env file');
    }
  });

  // ✅ 1. Successful login
  test('login with valid credentials', async ({ page, browserName }) => {
    const screenshotPath = path.join(screenshotsDir, `login-valid-${browserName}.png`);
    try {
      await page.goto('https://www.soulsyncai.site/en/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[placeholder*="Email" i]', { timeout: 20000 });

      // Fill in credentials
      await page.getByPlaceholder(/email/i).fill(EMAIL);
      await page.getByPlaceholder(/password/i).fill(PASSWORD);

      // ✅ FIXED BUTTON SELECTOR (was invalid before)
      const loginButton = page.getByRole('button', { name: /login/i });
      await expect(loginButton).toBeEnabled();
      await loginButton.click();

      // Wait for redirect or successful dashboard load
      await page.waitForLoadState('networkidle', { timeout: 60000 });

      // Confirm redirect success
      await expect
        .poll(async () => page.url(), {
          timeout: 15000,
          message: 'Expected redirect to /my-room or /profile-setup',
        })
        .toMatch(/(my-room|profile-setup)/);

      console.log(`✅ [${browserName}] Successfully logged in → ${page.url()}`);
    } catch (error) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`❌ [${browserName}] Login test failed. Screenshot: ${screenshotPath}`);
      throw error;
    }
  });

  // ✅ 2. Empty fields
  test('login fails with empty fields', async ({ page, browserName }) => {
    const screenshotPath = path.join(screenshotsDir, `login-empty-${browserName}.png`);
    try {
      await page.goto('https://www.soulsyncai.site/en/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button[type="submit"]', { timeout: 15000 });

      const submitButton = page.getByRole('button', { name: /login/i });
      await submitButton.click();

      const alert = page.locator('text=/required|empty|fill out/i');
      await expect(alert.first()).toBeVisible({ timeout: 7000 });

      console.log(`✅ [${browserName}] Empty field validation triggered.`);
    } catch (error) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`❌ [${browserName}] Empty fields test failed. Screenshot: ${screenshotPath}`);
      throw error;
    }
  });

  // ✅ 3. Wrong credentials
  test('login fails with wrong credentials', async ({ page, browserName }) => {
    const screenshotPath = path.join(screenshotsDir, `login-wrong-${browserName}.png`);
    try {
      await page.goto('https://www.soulsyncai.site/en/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[placeholder*="Email" i]', { timeout: 20000 });

      await page.getByPlaceholder(/email/i).fill('fakeuser@example.com');
      await page.getByPlaceholder(/password/i).fill('wrongpassword');

      const submitButton = page.getByRole('button', { name: /login/i });
      await submitButton.click();

      const alert = page.locator('text=/invalid|incorrect|wrong|error|failed/i');
      await expect(alert.first()).toBeVisible({ timeout: 10000 });

      console.log(`✅ [${browserName}] Wrong credentials correctly rejected.`);
    } catch (error) {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`❌ [${browserName}] Wrong credentials test failed. Screenshot: ${screenshotPath}`);
      throw error;
    }
  });
});
