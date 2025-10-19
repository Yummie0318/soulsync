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

  // Create storage state
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/en/login`);

  // Use CI environment secrets
  await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
  await page.click('button[type="submit"]');

  // Wait until redirected to My Room
  await page.waitForURL(`${BASE_URL}/en/my-room`);

  // Save storage state
  await page.context().storageState({ path: STORAGE_PATH });
  await page.close();

  console.log(`✅ Storage state saved to ${STORAGE_PATH}`);
});
