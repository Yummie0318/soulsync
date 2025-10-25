import { test, expect } from "@playwright/test";

test.describe("🤖 AI Assessment Page", () => {
  test.beforeEach(async ({ page }) => {
    // Simulate logged-in user
    await page.addInitScript(() => {
      localStorage.setItem("user_id", "456");
    });

    // Mock API for questions
    await page.route("**/api/ai/questions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          questions: [
            {
              id: 1,
              text: "What is your favorite color?",
              choices: ["Red", "Blue", "Green"],
            },
            {
              id: 2,
              text: "Which element suits you best?",
              choices: ["Fire", "Water", "Earth", "Air"],
            },
          ],
        }),
      });
    });

    // Mock API for saving answers
    await page.route("**/api/ai/save-answer", async (route) => {
      const body = await route.request().postDataJSON();
      console.log("✅ Saving mock answer:", body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test("should load and display the first question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    // Expect loading text first
    await expect(page.getByText("Loading AI assessment...")).toBeVisible();

    // Wait for question to appear
    await expect(page.getByText("What is your favorite color?")).toBeVisible();

    // Choices visible
    await expect(page.getByText("Red")).toBeVisible();
    await expect(page.getByText("Blue")).toBeVisible();
  });

  test("should select an answer and go to next question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    // Wait for first question
    await expect(page.getByText("What is your favorite color?")).toBeVisible();

    // Select "Blue"
    await page.getByText("Blue").click();

    // Click Next
    await page.getByRole("button", { name: "Next Question" }).click();

    // Wait for next question
    await expect(page.getByText("Which element suits you best?")).toBeVisible();
  });

  test("should redirect to result page after last question", async ({ page }) => {
    await page.goto("http://localhost:3000/en/ai-assessment");

    // First question
    await page.getByText("Red").click();
    await page.getByRole("button", { name: "Next Question" }).click();

    // Second question
    await page.getByText("Fire").click();

    // Wait for redirect (simulate after last question)
    const [response] = await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Next Question" }).click(),
    ]);

    expect(response?.url()).toContain("/assessment-result");
  });
});
