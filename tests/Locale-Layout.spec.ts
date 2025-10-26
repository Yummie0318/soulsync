import { test, expect } from "@playwright/test";

test.describe("Locale Layout", () => {
  test("renders page correctly for valid locale", async ({ page }) => {
    // Go to a known valid locale route, e.g., /en
    await page.goto("/en");

    // Check if messages from en.json are loaded
    await expect(page).toHaveTitle(/SoulSync/i); // assuming en.json contains page title
    await expect(page.locator("body")).toContainText(/Sign Up|Login|Profile/i);
  });

  test("renders another locale correctly", async ({ page }) => {
    // Go to another locale like /fr if supported
    await page.goto("/fr");

    // Check localized text exists (depending on your JSON translations)
    await expect(page.locator("body")).toContainText(/Connexion|Profil|S'inscrire/i);
  });

  test("shows not found for invalid locale", async ({ page }) => {
    // Navigate to a locale that doesn't exist
    const response = await page.goto("/xx");

    // The layout.tsx calls notFound() when locale file is missing
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/404|Not Found/i);
  });
});
