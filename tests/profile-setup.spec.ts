import { test, expect } from "@playwright/test";

test.describe("🧩 Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    // ✅ Mock user_id to bypass missing localStorage error
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "123");
    });

    // ✅ Go to profile setup page
    await page.goto("http://localhost:3000/en/profile-setup");

    // Wait for main heading
    await expect(page.getByRole("heading", { name: /complete profile/i })).toBeVisible();
  });

  test("Step 1 → Select Interests and go to next step", async ({ page }) => {
    // Mock interests API (optional, if your dev server doesn't serve real data)
    await page.route("/api/interests?locale=en", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, interest: "Music" },
          { id: 2, interest: "Art" },
          { id: 3, interest: "Sports" },
        ]),
      });
    });

    // Wait for interests to render
    await page.waitForSelector("button:has-text('Music')");

    // Select three interests
    await page.click("button:has-text('Music')");
    await page.click("button:has-text('Art')");
    await page.click("button:has-text('Sports')");

    // Proceed
    await page.click("button:has-text('Next')");
    await expect(page.getByText(/birthdate/i)).toBeVisible();
  });

  test("Step 2 → Enter valid birthdate", async ({ page }) => {
    await page.fill("input[placeholder='Year']", "1995");
    await page.fill("input[placeholder='Month']", "7");
    await page.fill("input[placeholder='Day']", "21");

    await page.click("button:has-text('Next')");
    await expect(page.getByText(/about you/i)).toBeVisible();
  });

  test("Step 3 → Select Gender, Looking For, and Star Sign", async ({ page }) => {
    // Mock necessary API endpoints
    await page.route("/api/genders?locale=en", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ id: 1, gender: "Female" }]),
      });
    });

    await page.route("/api/lookingfor?locale=en", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ id: 1, items: "Friendship" }]),
      });
    });

    await page.route("/api/zodiacs?locale=en", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ id: 1, zodiac: "Leo" }]),
      });
    });

    // Wait for dropdowns
    await page.waitForSelector("select");

    // Fill fields
    await page.selectOption("select", { label: "Female" });
    await page.check("label:has-text('Friendship') input");
    await page.selectOption("select", { label: "Leo" });

    // Next
    await page.click("button:has-text('Next')");
    await expect(page.getByText(/location/i)).toBeVisible();
  });

  test("Step 4 → Enter Location Info", async ({ page }) => {
    // Mock countries API
    await page.route("/api/countries?locale=en", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ id: 1, country: "Philippines" }]),
      });
    });

    await page.waitForSelector("select");
    await page.selectOption("select", { label: "Philippines" });

    await page.fill("input[placeholder='City']", "Tuguegarao");
    await page.fill("input[placeholder='Postal Code']", "3500");

    await page.click("button:has-text('Next')");
    await expect(page.getByText(/finishing touches/i)).toBeVisible();
  });

  test("Step 5 → Upload photo, add quote, and finish", async ({ page }) => {
    // Mock POST /api/profile-setup
    await page.route("/api/profile-setup", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Upload dummy file
    const filePath = "tests/assets/sample.jpg"; // Create a dummy file if needed
    await page.setInputFiles("#photoUpload", filePath);

    // Add quote
    await page.fill("textarea", "“Live simply, love deeply.”");

    // Finish
    await page.click("button:has-text('Finish')");

    // Expect success message to appear (or redirect)
    await expect(page).toHaveURL(/my-room/);
  });
});
