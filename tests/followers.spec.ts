import { test, expect } from "@playwright/test";

const mockFollowers = [
  {
    id: 1,
    username: "Alice",
    photo_file_path: "/images/alice.jpg",
    address: "Wonderland",
    age: 25,
    quote: "Curiosity rules!",
    looking_for: "Friendship",
    isFollowing: true,
  },
  {
    id: 2,
    username: "Bob",
    photo_file_path: "/images/bob.jpg",
    address: "Builder City",
    age: 30,
    quote: "Can we fix it?",
    looking_for: "Networking",
    isFollowing: false,
  },
];

test.describe("Followers Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock API
    await page.route("/api/followers/*", route => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockFollowers),
      });
    });

    // Go to followers page
    await page.goto("/en/followers");
    await page.waitForLoadState("networkidle");
  });

  test("should display followers list", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /followers/i })).toBeVisible();
    const cards = page.locator(".rounded-2xl");
    await expect(cards.first()).toBeVisible();
  });

  test("should allow searching for a follower", async ({ page }) => {
    const searchInput = page.locator("input[type='text']");
    await searchInput.fill("Bob");
    const bobCard = page.locator(".rounded-2xl", { hasText: "Bob" });
    await expect(bobCard).toBeVisible();
  });

  test("should open image preview when clicking on a follower image", async ({ page }) => {
    const firstImage = page.locator("img").first();
    await firstImage.click();
    const preview = page.locator("div.fixed.inset-0");
    await expect(preview).toBeVisible();
    await page.mouse.click(10, 10); // click outside to close
    await expect(preview).toBeHidden();
  });

  test("should open and close confirm dialog on remove", async ({ page }) => {
    const removeBtn = page.locator("button", { hasText: /remove/i }).first();
    await removeBtn.click();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    await cancelBtn.click();
    await expect(page.getByText(/are you sure/i)).toBeHidden();
  });
});
