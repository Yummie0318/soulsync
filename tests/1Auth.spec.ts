import { test, expect } from "@playwright/test";

test("mock register + OTP flow (English locale) → redirects to profile setup", async ({ page }) => {
  // 🧩 1️⃣ Mock /api/register → OTP sent
  await page.route("**/api/register", async (route) => {
    console.log("📨 Mocked /api/register");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "OTP sent successfully" }),
    });
  });

  // 🧩 2️⃣ Mock /api/verify-otp → successful verification
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

  // 🧭 3️⃣ Go to the correct registration page
  await page.goto("http://localhost:3000/en/login/auth");

  // 🧾 4️⃣ Fill the registration form
  await page.getByPlaceholder("johndoe").fill("joytestuser");
  await page.getByPlaceholder("your@email.com").fill("joylynmadriagatts@gmail.com");
  await page.getByPlaceholder("Create a password").fill("Password123!");
  await page.getByPlaceholder("Confirm your password").fill("Password123!");

  // 🖱️ 5️⃣ Click “Create Account”
  await page.getByRole("button", { name: /create account/i }).click();

  // 💬 6️⃣ Expect OTP modal to appear
  await expect(page.getByText("Enter OTP")).toBeVisible();

  // 🧮 7️⃣ Fill OTP
  await page.getByRole("textbox").fill("123456");

  // 🖱️ 8️⃣ Click “Verify”
  await page.getByRole("button", { name: /verify/i }).click();

  // ⏳ 9️⃣ Wait for navigation → /en/profile-setup
  await page.waitForURL("**/en/profile-setup");

  // ✅ 10️⃣ Confirm redirect success
  await expect(page).toHaveURL(/\/en\/profile-setup$/);
  console.log("🎉 Redirected to /en/profile-setup successfully!");
});
