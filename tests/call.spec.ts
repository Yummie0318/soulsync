import { test, expect } from "@playwright/test";

/**
 * 🎥 Call Page UI Test
 * - Loads the call page with mock params
 * - Verifies that the correct UI (audio/video) renders
 * - Confirms connection state indicator and End Call button
 */

test("🎧 Verify CallPage renders and displays call info", async ({ page }) => {
  // Use stored login session
  await page.goto("/en/my-messages");

  // Mock query params for the call
  const callParams = "?call_id=999&caller_id=1&receiver_id=2&type=audio";

  // Navigate to CallPage
  await page.goto(`/en/call${callParams}`);

  // Wait for the title to appear
  await expect(page.locator("h2")).toContainText("Audio Call");

  // Verify text changes depending on connection state
  await expect(page.locator("text=Connecting")).toBeVisible();

  // Verify the connection state indicator exists
  await expect(page.locator("text=Connection:")).toBeVisible();

  // Verify End Call button exists
  await expect(page.getByRole("button", { name: /End Call/i })).toBeVisible();

  // Take a screenshot for report
  await page.screenshot({ path: "playwright-report/callpage.png" });
});

test("🎥 Verify CallPage video layout loads", async ({ page }) => {
  const callParams = "?call_id=1000&caller_id=1&receiver_id=2&type=video";
  await page.goto(`/en/call${callParams}`);

  // Ensure video call title shows
  await expect(page.locator("h2")).toContainText("Video Call");

  // Verify video elements exist (local + remote)
  await expect(page.locator("video")).toHaveCount(2);

  // Confirm End Call button visible
  await expect(page.getByRole("button", { name: /End Call/i })).toBeVisible();

  await page.screenshot({ path: "playwright-report/callpage-video.png" });
});
