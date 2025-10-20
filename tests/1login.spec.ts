import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("🔐 Login using GitHub Secrets and save session", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("❌ Missing TEST_EMAIL or TEST_PASSWORD environment variables");
  }

  // Go to login page
  await page.goto("http://localhost:3000/en/login");

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click Sign In
  await page.click('button[type="submit"]');

  // Wait for redirect to My Room
  await page.waitForURL(/my-room/, { timeout: 30000 });
  await expect(page).toHaveURL(/my-room/);

  // Ensure storage folder exists
  const storageDir = path.join(process.cwd(), "storage");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
  }

  // Save session
  await page.context().storageState({ path: path.join(storageDir, "logged-in.json") });
  console.log("✅ Login successful, storage saved at storage/logged-in.json");
});
