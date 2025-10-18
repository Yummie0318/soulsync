import { test, expect } from "@playwright/test";

test.describe("SoulSyncAI — Feelings Quiz + Sign Up Flow", () => {
  const locales = ["en", "de", "zh"];

  for (const locale of locales) {
    test(`should select a feeling and reach the Journey Begin page for ${locale.toUpperCase()}`, async ({ page }) => {
      const url = `http://localhost:3000/${locale}/login/feelings-quiz`;
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");

      // 🚨 Ignore console 401 or missing translation errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (!/401|MISSING_MESSAGE/.test(text)) {
            console.warn("Console error:", text);
          }
        }
      });

      // ✅ Wait for the question to appear
      const question = page.getByText("How are you feeling?", { exact: false });
      await expect(question).toBeVisible({ timeout: 15000 });

      // ✅ Select first available feeling
      const firstFeeling = page.locator('button[role="option"]').first();
      await expect(firstFeeling).toBeVisible({ timeout: 10000 });
      await firstFeeling.click();

      // ✅ Wait for "Journey Begin" page by checking a visible header
      const journeyHeader = page.getByText("Your Journey", { exact: false });
      await journeyHeader.waitFor({ timeout: 20000 });

      // ✅ Verify key elements on Journey Begin page
      const startButton = page.getByRole("button", { name: /Sign Up|Start/i });
      await expect(startButton).toBeVisible();

      const description = page.locator("p").first();
      await expect(description).toBeVisible();

      // ✅ Optional: verify URL contains `/login/journey-begin`
      const currentUrl = page.url();
      expect(currentUrl).toMatch(new RegExp(`/${locale}/login/journey-begin`));
    });
  }

  // 🧪 Negative test — invalid locale should return 404
  test("should show 404 for invalid locale", async ({ page }) => {
    await page.goto("http://localhost:3000/xyz/login/feelings-quiz");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });
});
