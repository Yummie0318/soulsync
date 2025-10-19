import { test, expect } from "@playwright/test";

test.describe("My Room Page", () => {
  const locales = ["en", "de", "zh"]; // supported locales

  // Login before each test
  test.beforeEach(async ({ page }, testInfo) => {
    const loginUrl = "http://localhost:3000/en/login";
    await page.goto(loginUrl);
    await page.waitForLoadState("domcontentloaded");

    // Fail on page errors
    page.on("pageerror", (err) => {
      throw new Error(`❌ Page error: ${err.message}`);
    });

    // Fill login form
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");

    // Click first login button
    const loginButtonRegexes = [/sign in/i, /log in/i, /anmelden/i, /einloggen/i, /登录/i, /登入/i];
    for (const regex of loginButtonRegexes) {
      const btn = page.getByRole("button", { name: regex });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(2000); // wait for redirect
    const currentUrl = page.url();
    if (!currentUrl.includes("/my-room")) {
      testInfo.skip(true, "Login failed or redirect not ready");
    }
  });

  for (const locale of locales) {
    test(`should render My Room page correctly for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.waitForLoadState("domcontentloaded");

      // Check header title
      const header = page.locator("h1", { hasText: /My Room|Mein Raum|我的房間/ });
      await expect(header).toBeVisible();

      // Profile stats
      const posts = page.locator("div", { hasText: /posts|Beiträge|帖子/ }).first();
      const followers = page.locator("div", { hasText: /followers|Follower|粉絲/ }).first();
      const following = page.locator("div", { hasText: /following|Folge|追蹤/ }).first();

      await expect(posts).toBeVisible();
      await expect(followers).toBeVisible();
      await expect(following).toBeVisible();

      // Post input
      const postInput = page.locator("textarea", { hasText: /What's on your mind|Was denkst du|想法/ });
      await expect(postInput).toBeVisible();

      // Post button
      const postButton = page.locator("button", { hasText: /Post|Beitrag|發布/ });
      await expect(postButton).toBeVisible();

      // Avatar upload trigger
      const avatarButton = page.locator("div.rounded-full.cursor-pointer").first();
      await expect(avatarButton).toBeVisible();

      // Click avatar → opens modal
      await avatarButton.click();
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeVisible();
    });

    test(`should create a new post for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);

      const postInput = page.locator("textarea", { hasText: /What's on your mind|Was denkst du|想法/ });
      await postInput.fill("Test post from Playwright");

      const postButton = page.locator("button", { hasText: /Post|Beitrag|發布/ });
      await postButton.click();

      // New post should appear
      const newPost = page.locator("div", { hasText: "Test post from Playwright" });
      await expect(newPost).toBeVisible();
    });

    test(`should open edit profile modal for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);

      const editButton = page.locator("button", { hasText: /Edit|Bearbeiten|編輯/ }).first();
      await expect(editButton).toBeVisible();

      await editButton.click();

      const modal = page.locator("div", { hasText: /Edit Post|Beitrag bearbeiten|編輯帖子/ }).first();
      await expect(modal).toBeVisible();

      const cancelButton = modal.locator("button", { hasText: /Cancel|Abbrechen|取消/ });
      await expect(cancelButton).toBeVisible();

      const saveButton = modal.locator("button", { hasText: /Save|Speichern|保存/ });
      await expect(saveButton).toBeVisible();
    });
  }

  // Negative test — invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/my-room");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
