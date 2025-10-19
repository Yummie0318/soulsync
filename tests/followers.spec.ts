import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STORAGE_PATH = path.join(__dirname, '../storage/logged-in.json');
const BASE_URL = 'http://localhost:3000';

// Localized texts
const FOLLOW_TEXT: Record<string, RegExp> = {
  en: /follow/i,
  de: /zurückfolgen|folgt/i,
  zh: /回关|已关注/i,
};
const FOLLOWING_TEXT: Record<string, RegExp> = {
  en: /following/i,
  de: /folgt/i,
  zh: /已关注/i,
};
const REMOVE_TEXT: Record<string, RegExp> = {
  en: /remove/i,
  de: /entfernen/i,
  zh: /移除/i,
};
const NO_FOLLOWERS_TEXT: Record<string, RegExp> = {
  en: /no followers/i,
  de: /no followers found/i,
  zh: /未找到粉丝/i,
};

// === Programmatic login before tests ===
test.beforeAll(async ({ browser }) => {
  if (!fs.existsSync(STORAGE_PATH)) {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/en/login`);

    // Fill in the test account credentials
    await page.fill('input[type="email"]', process.env.TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');

    // Wait until login redirects to My Room
    await page.waitForURL(`${BASE_URL}/en/my-room`);
    
    // Save session state
    await page.context().storageState({ path: STORAGE_PATH });
    await page.close();
  }
});

// Use the stored login for all tests
test.use({ storageState: STORAGE_PATH });

// === Followers Page Tests ===
test.describe('Followers Page', () => {
  const locales = ['en', 'de', 'zh'];

  for (const locale of locales) {
    test(`should render followers page and perform actions for locale: ${locale}`, async ({ page }) => {
      const url = `${BASE_URL}/${locale}/followers`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 15000 });

      const searchInput = page.locator('input[placeholder]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      const noFollowers = page.locator(`text=${NO_FOLLOWERS_TEXT[locale]}`);
      const followersGrid = page.locator('[class*="grid"] > div');

      if (await noFollowers.isVisible({ timeout: 3000 })) {
        console.log(`No followers found for locale: ${locale.toUpperCase()}`);
      } else {
        const firstFollower = followersGrid.first();
        await expect(firstFollower).toBeVisible({ timeout: 10000 });

        const username = await firstFollower.locator('p').first().innerText();
        await searchInput.fill(username.slice(0, 3));
        await page.waitForTimeout(500);
        await expect(followersGrid.first().locator('p').first()).toHaveText(username);

        const followButton = firstFollower.locator('button', { hasText: FOLLOW_TEXT[locale] });
        if (await followButton.isVisible()) {
          await followButton.click({ timeout: 60000 });
          await page.waitForTimeout(500);
          await expect(followButton).toHaveText(FOLLOWING_TEXT[locale]);
        } else {
          console.warn(`⚠️ Follow button not found for locale: ${locale}`);
        }

        const removeButton = firstFollower.locator('button', { hasText: REMOVE_TEXT[locale] });
        if (await removeButton.count() > 0) {
          await removeButton.click();
          const confirmDialog = page.locator('text=Are you sure');
          await expect(confirmDialog).toBeVisible({ timeout: 5000 });
          const confirmBtn = page.locator('button', { hasText: REMOVE_TEXT[locale] }).last();
          await confirmBtn.click();
          await expect(confirmDialog).toHaveCount(0);
        }
      }

      console.log(`✅ Followers page tested for locale: ${locale.toUpperCase()}`);
    });
  }
});
