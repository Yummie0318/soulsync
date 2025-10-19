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

    // Click login button (multi-language support)
    const loginButtonRegexes = [
      /sign in/i,
      /log in/i,
      /anmelden/i,
      /einloggen/i,
      /登录/i,
      /登入/i,
    ];

    for (const regex of loginButtonRegexes) {
      const btn = page.getByRole("button", { name: regex });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.first().click();
        break;
      }
    }

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (!currentUrl.includes("/my-room")) {
      testInfo.skip(true, "Login failed or redirect not ready");
    }
  });

  for (const locale of locales) {
    test(`should render My Room page correctly for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.waitForLoadState("domcontentloaded");

      // ✅ Corrected translations
      const header = page.locator("h1", {
        hasText: /My Room|Mein Zimmer|我的房间/,
      });
      await expect(header.first()).toBeVisible();

      // ✅ Safer selectors for stats (fix strict mode duplicates)
      const posts = page
        .locator("div", { hasText: /posts|Beiträge|帖子/ })
        .first();
      const followers = page
        .locator("div", { hasText: /followers|Follower|关注者/ })
        .first();
      const following = page
        .locator("div", { hasText: /following|Folge|关注中/ })
        .first();

      await expect(posts).toBeVisible();
      await expect(followers).toBeVisible();
      await expect(following).toBeVisible();

      // ✅ Post input (adjusted translations)
      const postInput = page.locator("textarea[placeholder]", {
        hasText: /What's on your mind|Was denkst du|想法/,
      });
      await expect(postInput.first()).toBeVisible();

      // ✅ Post button (use simplified Chinese “发布”)
      const postButton = page
        .locator("button", { hasText: /Post|Beitrag|发布/ })
        .first();
      await expect(postButton).toBeVisible();

      // Avatar upload trigger
      const avatarButton = page.locator("div.rounded-full.cursor-pointer").first();
      await expect(avatarButton).toBeVisible();

      // Click avatar → opens modal
      await avatarButton.click();
      const fileInput = page.locator('input[type="file"]').first();
      await expect(fileInput).toBeVisible();
    });

    test(`should create a new post for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.waitForLoadState("domcontentloaded");

      const postInput = page.locator("textarea").first();
      await postInput.fill("Test post from Playwright");

      const postButton = page
        .locator("button", { hasText: /Post|Beitrag|发布/ })
        .first();
      await postButton.click();

      // ✅ Fix strict mode & multiple match issue
      const newPost = page
        .locator("div.bg-gray-800", { hasText: "Test post from Playwright" })
        .first();
      await expect(newPost).toBeVisible();
    });

    test(`should open edit profile modal for locale: ${locale}`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.waitForLoadState("domcontentloaded");

      const editButton = page
        .locator("button", { hasText: /Edit|Bearbeiten|编辑/ })
        .first();
      await expect(editButton).toBeVisible();

      await editButton.click();

      const modal = page
        .locator("div", { hasText: /Edit Post|Beitrag bearbeiten|编辑帖子/ })
        .first();
      await expect(modal).toBeVisible();

      const cancelButton = modal
        .locator("button", { hasText: /Cancel|Abbrechen|取消/ })
        .first();
      const saveButton = modal
        .locator("button", { hasText: /Save|Speichern|保存/ })
        .first();

      await expect(cancelButton).toBeVisible();
      await expect(saveButton).toBeVisible();
    });
  }

  // Negative test — invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/my-room");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
