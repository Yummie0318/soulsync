import { test, expect } from "@playwright/test";

// Use your saved logged-in session
test.use({ storageState: 'storage/logged-in.json' }); // <- path to your session file

test.describe("My Room Page", () => {
  const locales = ["en", "de", "zh"]; // Supported locales

  for (const locale of locales) {

    test(`should load My Room page correctly for locale: ${locale}`, async ({ page }) => {
      // Go to the page using relative path
      await page.goto(`/${locale}/my-room`);

      // Check profile header
      const profile = page.locator("h1:text('My Room'), h2");
      await expect(profile).toBeVisible();

      // Check stats section
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

      await page.locator("button:has-text('Post')").click();

      const newPost = page.locator("div", { hasText: "This is a test post" });
      await expect(newPost).toBeVisible();
    });

    test(`should open avatar upload modal for locale: ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/my-room`);

      const avatar = page.locator("div.rounded-full.cursor-pointer").first();
      await avatar.click();

      const modal = page.locator("div.fixed:has(input[type=file])");
      await expect(modal).toBeVisible();
    });

  }
});
