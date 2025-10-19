import { test, expect } from '@playwright/test';

// Use a saved logged-in session if needed
test.use({ storageState: 'storage/logged-in.json' });

test.describe('Followers Page', () => {
  const locales = ['en', 'de', 'zh']; // locales you want to test

  for (const locale of locales) {
    test(`should render followers page and perform actions for locale: ${locale}`, async ({ page }) => {
      // Navigate to followers page
      await page.goto(`/${locale}/followers`);

      // Wait for followers to load
      await page.waitForSelector('main');

      // Check that search input exists
      const searchInput = page.locator('input[placeholder]');
      await expect(searchInput).toBeVisible();

      // If no followers, show message
      const noFollowersText = page.locator('text=No followers');
      const followersGrid = page.locator('[class*="grid"] > div');
      
      if (await noFollowersText.isVisible()) {
        console.log('No followers found');
      } else {
        // Check at least one follower card exists
        await expect(followersGrid.first()).toBeVisible();

        // Test search functionality
        const firstFollower = await followersGrid.first();
        const username = await firstFollower.locator('p').first().innerText();
        await searchInput.fill(username.slice(0, 3)); // partial search
        await page.waitForTimeout(500); // wait for filtering
        await expect(followersGrid.first().locator('p').first()).toHaveText(username);

        // Test follow/unfollow toggle
        const followButton = firstFollower.locator('button', { hasText: /follow/i });
        await followButton.click();
        await page.waitForTimeout(500);
        await expect(followButton).toHaveText(/following/i);

        // Test remove button (if exists)
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
    });
  }
});
