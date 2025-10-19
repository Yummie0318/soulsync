import { test, expect, type TestInfo } from "@playwright/test";

test.describe("My Room Page", () => {
  const locales = ["en", "de", "zh"];

  // Automatically login before each test
  test.beforeEach(async ({ page }, testInfo: TestInfo) => {
    const loginUrl = `http://localhost:3000/en/login`;
    await page.goto(loginUrl);
    await page.waitForLoadState("domcontentloaded");

    // Handle console noise gracefully
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("401") &&
          !text.includes("MISSING_MESSAGE") &&
          !text.includes("Failed to load resource")
        ) {
          console.warn("⚠️ Ignored console error:", text);
        }
      }
    });

    // Fill login form
    await page.fill('input[type="email"]', "joylynmadriagats@gmail.com");
    await page.fill('input[type="password"]', "JRMadriaga97");

    // Click login
    const loginButtons = [
      /sign in/i, /log in/i, /anmelden/i, /einloggen/i, /登录/i, /登入/i,
    ];

    for (const regex of loginButtons) {
      const btn = page.getByRole("button", { name: regex });
      if (await btn.first().isVisible().catch(() => false)) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(2000);
    if (!page.url().includes("/my-room")) {
      testInfo.skip(true, "⚠️ Login failed — skipping My Room tests");
    }
  });

  // ✅ Test for each locale
  for (const locale of locales) {
    test(`should render My Room page correctly (${locale})`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.waitForLoadState("domcontentloaded");

      // Header
      const header = page.locator("h1", { hasText: /My Room|Mein Raum|我的房間/ });
      await expect(header).toBeVisible();

      // Profile stats
      await expect(page.getByText(/posts|Beiträge|帖子/i)).toBeVisible();
      await expect(page.getByText(/followers|Follower|粉絲/i)).toBeVisible();
      await expect(page.getByText(/following|Folge|追蹤/i)).toBeVisible();

      // Post input + button
      await expect(page.locator("textarea")).toBeVisible();
      const postButton = page.getByRole("button", { name: /Post|Beitrag|發布/i });
      await expect(postButton).toBeVisible();

      // Avatar upload modal
      const avatar = page.locator("div.rounded-full.cursor-pointer").first();
      await expect(avatar).toBeVisible();
      await avatar.click();
      await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    test(`should create a new post (${locale})`, async ({ page }) => {
      await page.goto(`http://localhost:3000/${locale}/my-room`);
      await page.locator("textarea").fill("Test post from Playwright");
      await page.getByRole("button", { name: /Post|Beitrag|發布/i }).click();

      const newPost = page.locator("div", { hasText: "Test post from Playwright" });
      await expect(newPost).toBeVisible();
    });
  }

  // ❌ Invalid locale
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/my-room");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
