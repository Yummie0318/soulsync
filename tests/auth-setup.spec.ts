import { test } from '@playwright/test';

test('Save logged-in state', async ({ page }) => {
  await page.goto('http://localhost:3000/en/login');

  // Fill in login form
  await page.fill('input[name="email"]', 'joylynmadriagats@gmail.com');
  await page.fill('input[name="password"]', 'JRMadriaga97');
  await page.click('button[type="submit"]');

  // Wait for successful login
  await page.waitForURL('**/my-room');

  // Save storage state
  await page.context().storageState({ path: 'storage/logged-in.json' });
});
