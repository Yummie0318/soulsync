import { test, expect } from '@playwright/test';

const locales = ['en', 'de', 'zh']; // Supported locales

test.describe('My Room Page', () => {

  // Automatically log in before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login'); // Default login page

    // Replace with your actual login selectors and credentials
    await page.fill('input[name="email"]', 'joylynmadriagats@gmail.com');
    await page.fill('input[name="password"]', 'JRMadriaga97');
    await page.click('button[type="submit"]');

    // Wait for the My Room page to load
    await page.waitForURL('**/my-room');
  });

  for (const locale of locales) {

    test(`should load My Room page correctly for locale: ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/my-room`);

      // Check profile header
      const profile = page.locator("h1:text('My Room'), h2");
      await expect(profile).toBeVisible();

      // Check stats section
      const stats = page.locator("div:has-text('Followers'), div:has-text('Following')");
      await expect(stats.first()).toBeVisible();

      // Check post input
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

      // Click avatar to open modal
      const avatar = page.locator("div.rounded-full.cursor-pointer").first();
      await avatar.click();

      // Check modal visibility
      const modal = page.locator("div.fixed:has(input[type=file])");
      await expect(modal).toBeVisible();
    });
  }
});
