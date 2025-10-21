import { test, expect } from "@playwright/test";

test("🔐 Login using GitHub Secrets without saving storage", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("❌ Missing TEST_EMAIL or TEST_PASSWORD environment variables");
  }

  // Go to login pages
  await page.goto("http://localhost:3000/en/login");

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click Sign In
  await page.click('button[type="submit"]');

  // Wait for redirect to My Room
  await page.waitForURL(/my-room/, { timeout: 30000 });
  await expect(page).toHaveURL(/my-room/);

  console.log("✅ Login successful. Continuing without storage state.");
});
