// tests/ai-assessment.spec.ts
import { test, expect } from "@playwright/test";

test.describe("🤖 AI Assessment Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "456");
    });

    // ✅ Mock generate endpoint
    await page.route("**/api/journey/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          questions: [
            {
              question_text: "What is your favorite color?",
              trait_key: "empathy",
              why_text:
                "Colors can reflect emotional tendencies and empathy levels.",
              options: [
                { text: "Red", score: 1 },
                { text: "Blue", score: 2 },
                { text: "Green", score: 3 },
              ],
            },
          ],
        }),
      });
    });

    // ✅ Mock save endpoint
    await page.route("**/api/journey/answer", async (route, request) => {
      const body = await request.postDataJSON();
      const hasFinished =
        body?.question_text?.includes("color") && body?.selected_option?.text === "Red";

      // Simulate that this was the final answer
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          answered_count: hasFinished ? 20 : 1,
        }),
      });
    });

    // ✅ Mock traits and compatibility finalization
    await page.route("**/api/journey/traits", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route("**/api/journey/compatibility", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test("should load and display the first question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");
    await expect(page.getByText("What is your favorite color?")).toBeVisible();
    await expect(page.getByText("Blue")).toBeVisible();
  });

  test("should select an answer and go to next question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");
    await page.getByText("Blue").click();
    await page.getByRole("button", { name: /Save & Next/i }).click();
    await expect(page.getByText("What is your favorite color?")).toBeVisible();
  });

  test("should complete assessment and show finish screen", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");
    await page.waitForTimeout(1000);

    await page.getByText("Red").click();
    await page.getByRole("button", { name: /Finish Assessment|Save & Next/i }).click();

    // Wait for the completion screen
    await expect(
      page.getByText(/Start Finding Match|Continue your AI Journey/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
