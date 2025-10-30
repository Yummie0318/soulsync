import { test, expect } from "@playwright/test";

test.describe("👤 Profile Setup full flow", () => {
  test("should complete the 5-step profile setup successfully", async ({ page }) => {
    // -------------------------------------------------------------
    // 1️⃣ Mock all API routes used by SWR + POST
    // -------------------------------------------------------------
    await page.route("**/api/interests?**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 1, interest: "Photography" },
          { id: 2, interest: "Gaming" },
          { id: 3, interest: "Music" },
          { id: 4, interest: "Travel" },
        ]),
      })
    );

    await page.route("**/api/genders?**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 1, gender: "Male" },
          { id: 2, gender: "Female" },
        ]),
      })
    );

    await page.route("**/api/lookingfor?**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: 1, items: "Friendship" },
          { id: 2, items: "Relationship" },
        ]),
      })
    );

    await page.route("**/api/zodiacs?**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: 1, zodiac: "Leo" }]),
      })
    );

    await page.route("**/api/countries?**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: 1, country: "Philippines" }]),
      })
    );

    await page.route("**/api/profile-setup", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    // -------------------------------------------------------------
    // 2️⃣ Setup: mock localStorage user_id
    // -------------------------------------------------------------
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "123");
    });

    // -------------------------------------------------------------
    // 3️⃣ Navigate
    // -------------------------------------------------------------
    await page.goto("/en/profile-setup");

    await expect(page.getByText(/Complete/i)).toBeVisible();

    // === STEP 1: Interests ===
    await page.waitForSelector('button:has-text("Photography")');
    await page.getByRole("button", { name: "Photography" }).click();
    await page.getByRole("button", { name: "Gaming" }).click();
    await page.getByRole("button", { name: "Music" }).click();

    const nextBtn = page.getByRole("button", { name: /Next/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // === STEP 2: Birthdate ===
    await page.getByPlaceholder(/Year/i).fill("1998");
    await page.getByPlaceholder(/Month/i).fill("12");
    await page.getByPlaceholder(/Day/i).fill("15");
    await nextBtn.click();

    // === STEP 3: About You ===
    await page.waitForSelector("select");
    await page.selectOption("select", { value: "1" }); // Male
    await page.getByText("Friendship").click();
    await nextBtn.click();

    // === STEP 4: Location ===
    await page.waitForSelector("select");
    await page.selectOption("select", { value: "1" }); // Philippines
    await page.getByPlaceholder(/City/i).fill("Manila");
    await page.getByPlaceholder(/Postal/i).fill("1000");
    await nextBtn.click();

    // === STEP 5: Finishing Touches ===
    await expect(page.getByText(/Favorite Quote/i)).toBeVisible();
    await page.getByRole("textbox").fill("Keep moving forward.");
    await page.getByRole("button", { name: /Finish/i }).click();

    // === VERIFY ===
    await page.waitForTimeout(1000); // let router push happen
    await expect(page).toHaveURL(/my-room/);
  });
});
