import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(__dirname, '../storage/logged-in.json');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test('Create storage state for CI login', async ({ browser }) => {
  // Ensure storage folder exists
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const page = await browser.newPage();
  console.log('🌐 Navigating to login page...');
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'domcontentloaded' });

  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('❌ Missing TEST_EMAIL or TEST_PASSWORD environment variables.');
  }

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click and wait for possible redirect
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.click('button[type="submit"]'),
  ]);

  console.log('🔄 Checking post-login redirect...');

  // ✅ Only accept redirect to my-room or followers
  const possibleUrls = [/\/en\/my-room/, /\/en\/followers/];
  const currentUrl = page.url();
  const isLoggedIn = possibleUrls.some((regex) => regex.test(currentUrl));

  if (!isLoggedIn) {
    console.log(`⚠️ Login did not redirect as expected (current: ${currentUrl})`);
    await expect(page.locator('text=/My Room|Followers|Logout/i')).toBeVisible({
      timeout: 30000,
    });
  }

  // Save logged-in session
  await page.context().storageState({ path: STORAGE_PATH });
  await page.close();

  console.log(`✅ Storage state saved to ${STORAGE_PATH}`);
});
