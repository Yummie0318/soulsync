import { test, expect } from "@playwright/test";

test.describe("🏝️ Island Welcome Page", () => {
  // Before each test, set a mock selected island in localStorage
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "123");
      localStorage.setItem("selected_island_id", "1");
    });
  });

  test("should redirect to island picker if no island is stored", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("selected_island_id");
    });

    const responsePromise = page.waitForResponse(/islands/);
    await page.goto("http://localhost:3000/en/island-welcome");
    await responsePromise;

    await expect(page).toHaveURL(/island-picker/);
  });

  test("should load island data and display it", async ({ page }) => {
    // Intercept the islands API to return mock data
    await page.route("**/api/islands?locale=en", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "Aurora Island",
            description: "A serene island filled with magical light.",
            icon: "🌅",
          },
        ]),
      });
    });

    await page.goto("http://localhost:3000/en/island-welcome");

    // Expect island name and description to be visible
    await expect(page.getByText("Aurora Island")).toBeVisible();
    await expect(page.getByText("A serene island filled with magical light.")).toBeVisible();

    // Expect AI assessment button
    await expect(page.getByRole("button", { name: /AI/i })).toBeVisible();
  });

  test("clicking AI assessment button should navigate to /ai-assessment", async ({ page }) => {
    await page.route("**/api/islands?locale=en", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, name: "Aurora Island", description: "Test", icon: "🌅" },
        ]),
      });
    });

    await page.goto("http://localhost:3000/en/island-welcome");

    await page.getByRole("button", { name: /AI/i }).click();

    await expect(page).toHaveURL(/ai-assessment/);
  });
});
