import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Use logged-in session
test.use({ storageState: 'storage/logged-in.json' });

// Localized button texts
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

test.describe('Followers Page', () => {
  const locales = ['en', 'de', 'zh'];

  for (const locale of locales) {
    test(`should render followers page and perform actions for locale: ${locale}`, async ({ page }) => {
      const url = `${BASE_URL}/${locale}/followers`;

      // Navigate and wait for page load
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');

      // Wait for main content
      const main = page.locator('main');
      await expect(main).toBeVisible({ timeout: 15000 });

      // Check search input
      const searchInput = page.locator('input[placeholder]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Check if there are followers
      const noFollowers = page.locator(`text=${NO_FOLLOWERS_TEXT[locale]}`);
      const followersGrid = page.locator('[class*="grid"] > div');

      if (await noFollowers.isVisible({ timeout: 3000 })) {
        console.log(`No followers found for locale: ${locale.toUpperCase()}`);
      } else {
        const firstFollower = followersGrid.first();
        await expect(firstFollower).toBeVisible({ timeout: 10000 });

        // Test search functionality
        const username = await firstFollower.locator('p').first().innerText();
        await searchInput.fill(username.slice(0, 3));
        await page.waitForTimeout(500);
        await expect(followersGrid.first().locator('p').first()).toHaveText(username);

        // Test follow/unfollow button
        const followButton = firstFollower.locator('button', { hasText: FOLLOW_TEXT[locale] });
        if (await followButton.isVisible()) {
          await followButton.click({ timeout: 60000 });
          await page.waitForTimeout(500);
          await expect(followButton).toHaveText(FOLLOWING_TEXT[locale]);
        } else {
          console.warn(`⚠️ Follow button not found for locale: ${locale}`);
        }

        // Test remove button if exists
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
