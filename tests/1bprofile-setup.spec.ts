import { test, expect } from "@playwright/test";

test.describe("Profile Setup Page", () => {
  test.use({
    storageState: "storage/logged-in.json", // ✅ ensure authenticated session
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- 1️⃣ Mock all API responses ---
    await page.route("**/api/interests?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, interest: "Music" },
          { id: 2, interest: "Travel" },
          { id: 3, interest: "Reading" },
          { id: 4, interest: "Gaming" },
        ]),
      });
    });

    await page.route("**/api/genders?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, gender: "Male" },
          { id: 2, gender: "Female" },
        ]),
      });
    });

    await page.route("**/api/lookingfor?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, items: "Friendship" },
          { id: 2, items: "Relationship" },
        ]),
      });
    });

    await page.route("**/api/zodiacs?**", async (route) => {
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, country: "Philippines" },
          { id: 2, country: "Japan" },
        ]),
      });
    });

    // ✅ FIXED formData type issue here
    await page.route("**/api/profile-setup", async (route) => {
      const req = route.request() as any; // 👈 TypeScript-safe cast
      const formData = await req.formData();
      console.log("📦 Submitted Form:", formData);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Profile setup complete",
        }),
      });
    });

    // --- 2️⃣ Navigate to Profile Setup ---
    await page.goto("/en/profile-setup");

    // --- 3️⃣ Step 1: Interests ---
    await page.waitForSelector("text=Your Interests");
    const interestButtons = page.locator(
      "button:has-text('Music'), button:has-text('Travel'), button:has-text('Gaming')"
    );
    await interestButtons.first().click();
    await interestButtons.nth(1).click();
    await interestButtons.nth(2).click();

    await page.getByRole("button", { name: /Next/i }).click();

    // --- 4️⃣ Step 2: Birthdate ---
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("5");
    await page.getByPlaceholder("DD").fill("20");
    await page.getByRole("button", { name: /Next/i }).click();

    // --- 5️⃣ Step 3: About You ---
    await page.getByRole("combobox").selectOption("1"); // Select Male
    await page.getByLabel(/Friendship/i).check();
    await page.getByRole("button", { name: /Next/i }).click();

    // --- 6️⃣ Step 4: Location ---
    await page.getByRole("combobox").selectOption("1"); // Select Philippines
    await page.getByPlaceholder(/City/i).fill("Manila");
    await page.getByPlaceholder(/Postal Code/i).fill("1234");
    await page.getByRole("button", { name: /Next/i }).click();

    // --- 7️⃣ Step 5: Finishing Touches ---
    await page.setInputFiles('input[type="file"]', {
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image content"),
    });
    await page.getByPlaceholder(/Write something/i).fill(
      "Keep smiling every day!"
    );
    await page.getByRole("button", { name: /Finish/i }).click();

    // --- 8️⃣ Verify redirect + completion ---
    await expect(page).toHaveURL(/\/my-room/);
  });
});
