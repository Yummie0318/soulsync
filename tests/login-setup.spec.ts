import { test } from "@playwright/test";
import path from "path";

const STORAGE_PATH = path.join(__dirname, "../storage/logged-in.json");
const BASE_URL = "http://localhost:3000";

test("Login once and save session", async ({ page }) => {
  await page.goto(`${BASE_URL}/en/login`);
  await page.waitForLoadState("domcontentloaded");

  // ✅ Fill in valid credentials (real user)
  await page.fill('input[type="email"]', "joylynmadriagats@gmail.com");
  await page.fill('input[type="password"]', "JRMadriaga97");

  // ✅ Click the "Sign In" button
  await page.getByRole("button", { name: /sign in/i }).click();

  // ✅ Wait for redirect to /my-room
  await page.waitForURL(`${BASE_URL}/en/my-room`, { timeout: 15000 });

  // ✅ Save the logged-in session to a file
  await page.context().storageState({ path: STORAGE_PATH });
});
