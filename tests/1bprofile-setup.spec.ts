import { test, expect } from "@playwright/test";

test.describe("Profile Setup Page", () => {
  test.use({
    storageState: "storage/logged-in.json",
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- 1️⃣ Mock all API responses ---
    const mockApi = (url: string, body: any) =>
      page.route(`**/${url}?**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });

    await mockApi("api/interests", [
      { id: 1, interest: "Music" },
      { id: 2, interest: "Travel" },
      { id: 3, interest: "Reading" },
      { id: 4, interest: "Gaming" },
    ]);

    await mockApi("api/genders", [
      { id: 1, gender: "Male" },
      { id: 2, gender: "Female" },
    ]);

    await mockApi("api/lookingfor", [
      { id: 1, items: "Friendship" },
      { id: 2, items: "Relationship" },
    ]);

    await mockApi("api/zodiacs", [
      { id: 1, zodiac: "Aries" },
      { id: 2, zodiac: "Leo" },
    ]);

    await mockApi("api/countries", [
      { id: 1, country: "Philippines" },
      { id: 2, country: "Japan" },
    ]);

    await page.route("**/api/profile-setup", async (route) => {
      const req = route.request() as any;
      const formData = await req.formData();
      console.log("📦 Submitted Form:", formData);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Profile setup complete" }),
      });
    });

    // --- 2️⃣ Navigate to Profile Setups ---
    await page.goto("/en/profile-setup");

    // --- Helper for safe button clicks ---
    const clickNext = async () => {
      const btn = page.locator("button:has-text('Next')");
      await btn.waitFor({ state: "visible", timeout: 10000 });
      await expect(btn).toBeEnabled();
      await btn.click({ force: true });
    };

    // --- 3️⃣ Step 1: Interests ---
    await page.waitForSelector("text=Your Interests");
    const interestButtons = page.locator(
      "button:has-text('Music'), button:has-text('Travel'), button:has-text('Gaming')"
    );
    await interestButtons.first().click();
    await interestButtons.nth(1).click();
    await interestButtons.nth(2).click();
    await clickNext();

    // --- 4️⃣ Step 2: Birthdate ---
    await page.getByPlaceholder("YYYY").fill("1995");
    await page.getByPlaceholder("MM").fill("5");
    await page.getByPlaceholder("DD").fill("20");
    await clickNext();

    // --- 5️⃣ Step 3: About You ---
    await page.getByRole("combobox").selectOption("1"); // Male
    await page.getByLabel(/Friendship/i).check();
    await clickNext();

    // --- 6️⃣ Step 4: Location ---
    await page.getByRole("combobox").selectOption("1"); // Philippines
    await page.getByPlaceholder(/City/i).fill("Manila");
    await page.getByPlaceholder(/Postal Code/i).fill("1234");
    await clickNext();

    // --- 7️⃣ Step 5: Finishing Touches ---
    await page.setInputFiles('input[type="file"]', {
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image content"),
    });
    await page.getByPlaceholder(/Write something/i).fill("Keep smiling every day!");
    const finishBtn = page.locator("button:has-text('Finish')");
    await finishBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(finishBtn).toBeEnabled();
    await finishBtn.click({ force: true });

    // --- 8️⃣ Verify redirect + completion ---
    await expect(page).toHaveURL(/\/my-room/);
  });
});
