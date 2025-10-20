import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

test("🔐 Login and save session locally", async ({ page }) => {
  const email = process.env.TEST_EMAIL || "joylynmadriagats@gmail.com";
  const password = process.env.TEST_PASSWORD || "JRMadriaga97";

  await page.goto("http://localhost:3000/en/login");

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/my-room/, { timeout: 30000 });

  // Ensure storage folder exists
  const storageDir = path.join(process.cwd(), "storage");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir);
  }

  await page.context().storageState({ path: path.join(storageDir, "logged-in.json") });
  console.log("✅ Local login successful, storage saved.");
});
