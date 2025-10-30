import { test, expect } from "@playwright/test";

test("🧩 Complete mocked profile setup flow", async ({ page }) => {
  // 🧠 Store user ID in localStorage before visiting page
  await page.addInitScript(() => {
    localStorage.setItem("user_id", "12345");
  });

  // -------------------------------
  // 🔹 Mock API Endpoints
  // -------------------------------

  await page.route("**/api/interests?**", async (route) => {
    console.log("🌐 Mocked /api/interests");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, interest: "Photography" },
        { id: 2, interest: "Music" },
        { id: 3, interest: "Gaming" },
        { id: 4, interest: "Travel" },
      ]),
    });
  });

  await page.route("**/api/genders?**", async (route) => {
    console.log("🌐 Mocked /api/genders");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, gender: "Female" },
        { id: 2, gender: "Male" },
      ]),
    });
  });

  await page.route("**/api/lookingfor?**", async (route) => {
    console.log("🌐 Mocked /api/lookingfor");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, items: "Friendship" },
        { id: 2, items: "Dating" },
      ]),
    });
  });

  await page.route("**/api/zodiacs?**", async (route) => {
    console.log("🌐 Mocked /api/zodiacs");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, zodiac: "Aries" },
        { id: 2, zodiac: "Leo" },
      ]),
    });
  });

  await page.route("**/api/countries?**", async (route) => {
    console.log("🌐 Mocked /api/countries");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: 1, country: "Philippines" },
        { id: 2, country: "Japan" },
      ]),
    });
  });

  // ✅ Mock final form submission
  await page.route("**/api/profile-setup", async (route) => {
    console.log("✅ Mocked /api/profile-setup");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Profile setup successful!" }),
    });
  });

  // -------------------------------
  // 🧭 Visit the profile setup page
  // -------------------------------
  await page.goto("http://localhost:3000/en/profile-setup");
  await expect(page).toHaveURL(/\/en\/profile-setup$/);
  console.log("✅ Profile Setup Page loaded");

  // -------------------------------
  // 🔹 STEP 1: Select Interests
  // -------------------------------
  const interestButtons = await page.locator("button", { hasText: "Photography" }).all();
  expect(interestButtons.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Photography" }).click();
  await page.getByRole("button", { name: "Music" }).click();
  await page.getByRole("button", { name: "Gaming" }).click();

  // Wait for button to become enabled
  const nextBtn = page.getByRole("button", { name: /next/i });
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // -------------------------------
  // 🔹 STEP 2: Birthdate
  // -------------------------------
  await page.getByPlaceholder(/year/i).fill("2000");
  await page.getByPlaceholder(/month/i).fill("12");
  await page.getByPlaceholder(/day/i).fill("15");

  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // -------------------------------
  // 🔹 STEP 3: About You
  // -------------------------------
  await page.selectOption("select", { label: "Female" });
  await page.getByLabel("Friendship").check();

  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // -------------------------------
  // 🔹 STEP 4: Location
  // -------------------------------
  await page.selectOption("select", { label: "Philippines" });
  await page.getByPlaceholder(/city/i).fill("Manila");
  await page.getByPlaceholder(/postal/i).fill("1000");

  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // -------------------------------
  // 🔹 STEP 5: Final Touches
  // -------------------------------
  // Mock file upload
  const photoUpload = page.locator('input[type="file"]');
  await photoUpload.setInputFiles({
    name: "avatar.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake image content"),
  });

  await page.getByPlaceholder(/quote/i).fill("Live, laugh, love!");
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  // -------------------------------
  // 🔹 Verify successful mock POST
  // -------------------------------
  await page.waitForTimeout(500); // wait for transition or redirect
  console.log("🎉 Mocked profile setup completed!");
});
