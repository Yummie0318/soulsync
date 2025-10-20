import { test, expect } from "@playwright/test";

test("🔐 Login using GitHub Secrets and save session", async ({ page }) => {
  // Go to login page (adjust locale if needed)
  await page.goto("http://localhost:3000/en/login");

  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("❌ Missing TEST_EMAIL or TEST_PASSWORD environment variables");
  }

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click Sign In button
  await page.click('button[type="submit"]');

  // Wait until redirect to My Room page (or your post-login route)
  await page.waitForURL(/my-room/, { timeout: 15000 });

  // Verify that the page loaded correctly
  await expect(page).toHaveURL(/my-room/);

  // ✅ Save session for future tests
  await page.context().storageState({ path: "storage/logged-in.json" });

  console.log("✅ Login successful, saved storage state!");
});
