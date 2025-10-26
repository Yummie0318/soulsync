import { test, expect, Page } from "@playwright/test";

// --- Helper functions ---
async function waitForButtonEnabled(page: Page, name: string, timeout = 20000) {
  const button = page.getByRole("button", { name: new RegExp(name, "i") }).first();
  await button.waitFor({ state: "visible" });

  await expect
    .poll(async () => await button.isEnabled(), {
      message: `Waiting for "${name}" button to be enabled`,
      timeout,
      intervals: [500],
    })
    .toBe(true);

  return button;
}

async function clickButton(page: Page, name: string) {
  const button = await waitForButtonEnabled(page, name);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    button.click(),
  ]);
}

// --- Test suite ---
test.describe("Profile Setup Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/profile-setup");
    await page.waitForLoadState("networkidle");
  });

  test("should complete all steps and submit profile setup successfully", async ({ page }) => {
    // --- Step 1: Select Interests ---
    const interestButtons = page.getByRole("button", { name: /interest/i });
    await interestButtons.first().waitFor({ state: "visible", timeout: 10000 });

    const interestCount = await interestButtons.count();
    console.log(`Found ${interestCount} interest buttons`);
    for (let i = 0; i < Math.min(3, interestCount); i++) {
      await interestButtons.nth(i).click();
      await page.waitForTimeout(200);
    }

    await clickButton(page, "Next");

    // --- Step 2: Enter Birthdate ---
    await page.getByPlaceholder("Year").fill("1995");
    await page.getByPlaceholder("Month").fill("06");
    await page.getByPlaceholder("Day").fill("15");
    await page.waitForTimeout(300);
    await clickButton(page, "Next");

    // --- Step 3: About You ---
    await page.getByLabel("Gender").selectOption({ index: 1 });

    // "Looking For" — handle toggle buttons instead of checkboxes
    const lookingForOptions = ["Men", "Women"]; // update these to match your actual UI labels
    for (const option of lookingForOptions) {
      const optionButton = page.getByRole("button", { name: new RegExp(option, "i") });
      if (await optionButton.isVisible()) {
        await optionButton.click();
        await page.waitForTimeout(200);
      } else {
        console.warn(`⚠️ Skipped: looking-for option "${option}" not visible`);
      }
    }

    await page.getByLabel("Star Sign").selectOption({ label: "Aries" });
    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 4: Location ---
    await page.getByLabel("Country").selectOption({ index: 1 });
    await page.getByPlaceholder(/city/i).fill("Manila");
    await page.getByPlaceholder(/postal/i).fill("1000");
    await page.waitForTimeout(500);
    await clickButton(page, "Next");

    // --- Step 5: Finishing Touches ---
    const photoPath = "tests/fixtures/photo.png";
    await page.getByLabel(/upload photo/i).setInputFiles(photoPath);
    await page.getByPlaceholder(/favorite quote/i).fill("Keep learning every day!");
    await page.waitForTimeout(800);
    await clickButton(page, "Finish");

    // --- Assert success message ---
    await expect(page.getByText("Profile setup complete!")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Welcome to your personal room!")).toBeVisible();
  });
});
