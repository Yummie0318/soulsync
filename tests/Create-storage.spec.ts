import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(__dirname, '../storage/logged-in.json');
const BASE_URL = 'http://localhost:3000';

test('Create storage state for CI login', async ({ browser }) => {
  // Ensure storage folder exists
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const page = await browser.newPage();
  console.log('🌐 Navigating to login page...');
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'domcontentloaded' });

  // Use CI environment variables
  const email = process.env.TEST_EMAIL || 'test@example.com';
  const password = process.env.TEST_PASSWORD || 'password123';

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // ✅ Wait until the network is idle to allow redirects to happen
  await page.waitForLoadState('networkidle');

  console.log('🔄 Waiting for post-login redirect...');
  // ✅ Match ANY of these possible redirect URLs after login
  await page.waitForURL(
    new RegExp(`${BASE_URL}/en/(my-room|followers|home|dashboard|profile)`),
    { timeout: 60000 }
  );

  // Save logged-in session
  await page.context().storageState({ path: STORAGE_PATH });
  await page.close();

  console.log(`✅ Storage state saved to ${STORAGE_PATH}`);
});
