import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const STORAGE_PATH = path.join(__dirname, '../storage/logged-in.json');

test.use({ storageState: STORAGE_PATH });

test.beforeAll(async ({ browser }) => {
  if (!fs.existsSync(STORAGE_PATH)) {
    console.log('⚠️ Logged-in storage not found. Logging in to generate it...');
    const context = await browser.newContext();
    const page = await context.newPage();

    // Go to login page
    await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'domcontentloaded' });

    // Fill in your credentials
    await page.fill('input[type="email"]', 'joylynmadriagats@gmail.com');
    await page.fill('input[type="password"]', 'JRMadriaga97');

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to /my-room
    await page.waitForURL(`${BASE_URL}/en/my-room`, { timeout: 15000 });

    // Save storage state
    await context.storageState({ path: STORAGE_PATH });
    await context.close();

    console.log('✅ Logged-in storage generated.');
  }
});

test.describe('Followers Page', () => {
  const locales = ['en', 'de', 'zh'];

  for (const locale of locales) {
    test(`should render followers page and perform actions for locale: ${locale}`, async ({ page }) => {
      const url = `${BASE_URL}/${locale}/followers`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      // Wait for main content
      await page.waitForSelector('main');

      // Search input
      const searchInput = page.locator('input[placeholder]');
      await expect(searchInput).toBeVisible();

      // Followers check
      const noFollowersText = page.locator('text=No followers');
      const followersGrid = page.locator('[class*="grid"] > div');

      if (await noFollowersText.isVisible()) {
        console.log('No followers found');
      } else {
        const firstFollower = followersGrid.first();
        await expect(firstFollower).toBeVisible();

        // Test search
        const username = await firstFollower.locator('p').first().innerText();
        await searchInput.fill(username.slice(0, 3));
        await page.waitForTimeout(500);
        await expect(followersGrid.first().locator('p').first()).toHaveText(username);

        // Follow/unfollow
        const followButton = firstFollower.locator('button', { hasText: /follow/i });
        await followButton.click();
        await page.waitForTimeout(500);
        await expect(followButton).toHaveText(/following/i);

        // Remove follower if exists
        const removeButton = firstFollower.locator('button', { hasText: /remove/i });
        if (await removeButton.count() > 0) {
          await removeButton.click();
          const confirmDialog = page.locator('text=Are you sure');
          await expect(confirmDialog).toBeVisible();
          const confirmBtn = page.locator('button', { hasText: /remove/i }).last();
          await confirmBtn.click();
          await expect(confirmDialog).toHaveCount(0);
        }
      }

      console.log(`✅ Followers page tested for locale: ${locale.toUpperCase()}`);
    });
  }
});
