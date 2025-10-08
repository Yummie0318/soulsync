import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Ensure screenshots folder exists
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

test('check the SoulSyncAI landing page', async ({ page }) => {
  // Go to the landing page
  await page.goto('https://www.soulsyncai.site/en/landing');

  // Wait for main heading and verify text
  const mainHeading = page.locator('h1');
  await expect(mainHeading).toHaveText(/SoulSync AI/i);

  // ✅ Fix: "Get Started" is a link, not a button
  const getStartedLink = page.getByRole('link', { name: 'Get Started' });
  await expect(getStartedLink).toBeVisible();

  // ✅ Same fix for "Login"
  const loginLink = page.getByRole('link', { name: 'Login' });
  await expect(loginLink).toBeVisible();

  // Take screenshot after page settles
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(screenshotsDir, 'landing.png'), fullPage: true });
});
