import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Ensure screenshots folder exists
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

test('navigate main pages on SoulSyncAI', async ({ page }) => {
  // Start at the homepage
  await page.goto('https://www.soulsyncai.site/');

  // Step 1: Wait for the "Continue" button and click it
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  // ✅ Step 2: Wait for animation to finish by checking a stable element on the landing page
  // Replace 'h1' with something unique if available on your landing page
  await page.waitForSelector('h1', { state: 'visible' });

  // Take screenshot after animation has completed
  await page.screenshot({ path: path.join(screenshotsDir, 'homepage.png'), fullPage: true });

  // Step 3: (Optional) Navigate further if needed
  // const nextButton = page.getByRole('button', { name: 'Next Page' });
  // await expect(nextButton).toBeVisible();
  // await nextButton.click();
  // await page.waitForSelector('h2'); // or another element on next page
  // await page.screenshot({ path: path.join(screenshotsDir, 'page2.png'), fullPage: true });
});
