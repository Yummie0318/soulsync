// tests/followers.spec.ts
import { test, expect } from "@playwright/test";

test("💬 Verify Messages Page loads with conversations", async ({ page }) => {
  // The logged-in session will be automatically loaded from storage/logged-in.json
  await page.goto("/en/my-messages");

  // Expect the page title
  await expect(page.locator("h1")).toHaveText("Messages");

  // Wait for conversations to load
  await page.waitForTimeout(3000);

  // Check if conversation list exists or “No conversations yet 💬”
  const hasConversations = await page
    .locator("section >> text=No conversations yet 💬")
    .count();

  if (hasConversations === 0) {
    // Conversations exist
    const firstConversation = page.locator("section button").first();
    await expect(firstConversation).toBeVisible();
  } else {
    // No conversations yet message is visible
    await expect(page.locator("text=No conversations yet 💬")).toBeVisible();
  }

  // Screenshot for report
  await page.screenshot({ path: "playwright-report/messages-page.png" });
});
