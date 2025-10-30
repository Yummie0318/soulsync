// tests/ai-assessment.spec.ts
import { test, expect } from "@playwright/test";

test.describe("🤖 AI Assessment Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "456");
    });

    // Mock generate endpoint
    await page.route("**/api/journey/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          question: {
            question_text: "What is your favorite color?",
            trait_key: "empathy",
            options: [
              { text: "Red", score: 1 },
              { text: "Blue", score: 2 },
              { text: "Green", score: 3 },
            ],
          },
        }),
      });
    });

    // Mock save endpoint
    await page.route("**/api/journey/answer", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock traits and compatibility endpoints
    await page.route("**/api/journey/traits", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
    );
    await page.route("**/api/journey/compatibility", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
    );
  });

  test("should load and display the first question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    await expect(page.getByText("What is your favorite color?")).toBeVisible();
    await expect(page.getByText("Red")).toBeVisible();
    await expect(page.getByText("Blue")).toBeVisible();
  });

  test("should select an answer and go to next question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    await expect(page.getByText("What is your favorite color?")).toBeVisible();

    await page.getByText("Blue").click();
    await page.getByRole("button", { name: /Save & Next/i }).click();

    // When the next question is loaded
    await expect(page.getByText("What is your favorite color?")).toBeVisible(); // Mock returns same text for now
  });

  test("should complete assessment and show finish screen", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    await page.getByText("Red").click();
    await page.getByRole("button", { name: /Finish Assessment|Save & Next/i }).click();

    // Should eventually show completion text or buttons
    await expect(
      page.getByText(/Start Finding Match|Continue your AI Journey/i)
    ).toBeVisible();
  });
});
