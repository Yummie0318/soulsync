import { test, expect } from "@playwright/test";

test("mock register + OTP flow → redirects to profile setup", async ({ page }) => {
  // 🧩 1️⃣ Intercept the /api/register request and mock OTP-sent success
  await page.route("**/api/register", async (route) => {
    console.log("📨 Mocked /api/register");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "OTP sent successfully" }),
    });
  });

  // 🧩 2️⃣ Intercept /api/verify-otp to simulate a successful verification
  await page.route("**/api/verify-otp", async (route) => {
    console.log("✅ Mocked /api/verify-otp");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "mock-user-123", email: "joylynmadriagatts@gmail.com" },
        message: "Account created successfully",
      }),
    });
  });

  // 🧭 3️⃣ Go to the register page
  await page.goto("/en/register");

  // 🧾 4️⃣ Fill registration form
  await page.getByPlaceholder("Enter username").fill("joytestuser");
  await page.getByPlaceholder("Enter email").fill("joylynmadriagatts@gmail.com");
  await page.getByPlaceholder("Enter password").fill("Password123!");
  await page.getByPlaceholder("Confirm password").fill("Password123!");

  // 🖱️ 5️⃣ Click the "Create Account" button
  await page.getByRole("button", { name: /create account/i }).click();

  // 💬 6️⃣ Expect OTP modal to appear
  await expect(page.getByText("Enter OTP")).toBeVisible();

  // 🧮 7️⃣ Fill in the OTP (any dummy value works)
  await page.getByRole("textbox").fill("123456");

  // 🖱️ 8️⃣ Click "Verify"
  await page.getByRole("button", { name: /verify/i }).click();

  // ⏳ 9️⃣ Wait for navigation → profile setup
  await page.waitForURL("**/profile-setup");

  // ✅ 10️⃣ Assert we’re now on the profile setup page
  await expect(page).toHaveURL(/\/profile-setup$/);
  console.log("🎉 Redirected to profile setup successfully!");
});
