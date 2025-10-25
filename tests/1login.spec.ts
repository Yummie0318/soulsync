import { test, expect } from "@playwright/test";
test.use({ storageState: undefined });

test("🔐 Login using GitHub Secrets and save storage", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("❌ Missing TEST_EMAIL or TEST_PASSWORD environment variables");
  }

  console.log("🌐 Navigating to login page...");
  await page.goto("http://localhost:3000/en/login");

  console.log("✏️ Filling in credentials...");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  console.log("⏳ Waiting for successful redirect...");
  await page.waitForURL(/my-room/, { timeout: 60000 });
  await page.waitForURL(/my-room/, { timeout: 90000 });
  await expect(page).toHaveURL(/my-room/);

  // ✅ Save storage state for reuse in later tests tests
  await page.context().storageState({ path: "storage/logged-in.json" });

  console.log("✅ Login successful. Storage state saved to storage/logged-in.json");
});