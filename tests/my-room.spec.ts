import { test, expect } from '@playwright/test';

// Use the saved logged-in session
test.use({ storageState: 'storage/logged-in.json' });

test.describe('My Room Page', () => {
  const locales = ['en', 'de', 'zh']; // Supported locales

  for (const locale of locales) {
    test(`should load My Room page correctly for locale: ${locale}`, async ({ page }) => {
      // Navigate directly to My Room page
      await page.goto(`/${locale}/my-room`);

      // Wait for profile header to be visible
      const profile = page.locator("h1:text('My Room'), h2");
      await expect(profile).toBeVisible();

      // Check if stats section exists
      const stats = page.locator("div:has-text('Followers'), div:has-text('Following')");
      await expect(stats.first()).toBeVisible();

      // Check posts section
      const postInput = page.locator("textarea[placeholder='What’s on your mind?']");
      await expect(postInput).toBeVisible();
    });

    test(`should create a new post for locale: ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/my-room`);

      const postInput = page.locator("textarea[placeholder='What’s on your mind?']");
      await postInput.fill("This is a test post");

      // Click post button
      await page.locator("button:has-text('Post')").click();

      // Expect the new post to appear
      const newPost = page.locator("div", { hasText: "This is a test post" });
      await expect(newPost).toBeVisible();
    });

    test(`should open avatar upload modal for locale: ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/my-room`);

      // Click on avatar to open modal
      const avatar = page.locator("div.rounded-full.cursor-pointer").first();
      await avatar.click();

      // Modal should be visible
      const modal = page.locator("div.fixed:has(input[type=file])");
      await expect(modal).toBeVisible();
    });
  }
});
