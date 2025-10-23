import { test, expect } from "@playwright/test";

/**
 * 📲 Incoming Call Popup Test
 * - Opens page with mock socket provider
 * - Simulates "call:ringing" event
 * - Verifies ringtone popup appears and can be accepted/rejected
 */

test.describe("📞 Incoming Call Popup", () => {
  test("should display popup when call:ringing event received", async ({ page }) => {
    // Load the app
    await page.goto("/en/my-messages");

    // Inject mock socket
    await page.addInitScript(() => {
      window.__mockSocket__ = {
        emit: (event, data) => console.log("MOCK EMIT", event, data),
        on: (event, cb) => {
          if (event === "call:ringing") {
            // Trigger popup shortly after page loads
            setTimeout(() => {
              cb({
                id: 101,
                caller_id: 1,
                receiver_id: Number(localStorage.getItem("user_id")) || 999,
                call_type: "video",
              });
            }, 1000);
          }
        },
        off: () => {},
        id: "mock-socket-1",
      };
    });

    // Replace real socket provider with mock
    await page.evaluate(() => {
      const socketProvider = window.__mockSocket__;
      window.useSocket = () => ({
        socket: socketProvider,
        isConnected: true,
      });
    });

    // Wait for popup
    await expect(page.locator("text=Incoming video call")).toBeVisible({ timeout: 8000 });

    // Check buttons
    await expect(page.getByTitle("Accept")).toBeVisible();
    await expect(page.getByTitle("Reject")).toBeVisible();

    // Screenshot proof
    await page.screenshot({ path: "playwright-report/incoming-call-popup.png" });
  });

  test("should close popup on reject", async ({ page }) => {
    await page.goto("/en/my-messages");

    // Inject fake incoming call and auto-reject
    await page.addInitScript(() => {
      window.__mockSocket__ = {
        emit: (event, data) => console.log("MOCK EMIT", event, data),
        on: (event, cb) => {
          if (event === "call:ringing") {
            setTimeout(() => {
              cb({
                id: 102,
                caller_id: 1,
                receiver_id: Number(localStorage.getItem("user_id")) || 999,
                call_type: "audio",
              });
            }, 1000);
          }
        },
        off: () => {},
        id: "mock-socket-2",
      };
    });

    await page.evaluate(() => {
      const socketProvider = window.__mockSocket__;
      window.useSocket = () => ({
        socket: socketProvider,
        isConnected: true,
      });
    });

    await expect(page.locator("text=Incoming audio call")).toBeVisible({ timeout: 8000 });

    // Click Reject
    await page.getByTitle("Reject").click();

    // Popup should disappear
    await expect(page.locator("text=Incoming audio call")).toHaveCount(0, { timeout: 5000 });

    await page.screenshot({ path: "playwright-report/incoming-call-reject.png" });
  });
});
