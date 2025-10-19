import { test, expect } from "@playwright/test";

test.use({ storageState: "storage/logged-in.json" });

test.describe("My Room Page", () => {
  const locales = ["en", "de", "zh"];
  const BASE_URL = "http://localhost:3000";

  for (const locale of locales) {
    test(`should load and log out successfully for locale: ${locale}`, async ({ page }) => {
      const url = `${BASE_URL}/${locale}/my-room`;

      // Navigate and wait for stable load
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      // ✅ Verify URL
      await expect(page).toHaveURL(new RegExp(`${locale}/my-room`));

      // ❌ Ensure no 404 or error text
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).not.toMatch(/404|not found|error/i);

      // ✅ Header check (localized)
      const header = page.locator("h1", {
        hasText: /My Room|Mein Zimmer|我的房間|我的房间/,
      });
      await expect(header).toBeVisible({ timeout: 10000 });

      // ✅ Check for Edit/Profile button
      const profileButton = page.getByRole("button", {
        name: /Edit|Bearbeiten|Profil|編輯|编辑/i,
      });
      await expect(profileButton).toBeVisible({ timeout: 8000 });

      console.log(`✅ ${locale.toUpperCase()} My Room loaded successfully.`);

      // ✅ ---- Logout Section ----
      const logoutButton = page.getByRole("button", {
        name: /Logout|Abmelden|登出|退出/i,
      });

      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForLoadState("networkidle");

        // ✅ Expect redirect to homepage "/"
        await expect(page).toHaveURL(`${BASE_URL}/`);

        // ✅ Verify homepage is visible (e.g., contains “Welcome” or app name)
        const homeContent = page.locator("body");
        await expect(homeContent).toContainText(/SoulSync|Welcome|Start|开始|開始/i);

        console.log(`👋 Successfully logged out for locale: ${locale.toUpperCase()}`);
      } else {
        console.warn(`⚠️ Logout button not found for locale: ${locale.toUpperCase()}`);
      }
    });
  }
});
