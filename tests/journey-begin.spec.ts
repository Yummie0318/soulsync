import { test, expect } from '@playwright/test';

test.describe('SoulSyncAI — Journey Begin Page', () => {
  test('should display the journey-begin page correctly', async ({ page }) => {
    test.setTimeout(30000);

    const url = 'https://www.soulsyncai.site/en/login/journey-begin';
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // ✅ Wait for a heading or title that indicates the page loaded
    const header = page.locator('h1, h2').filter({ hasText: /Journey|Your Journey|Begin/i });
    await expect(header).toBeVisible({ timeout: 10000 });
    console.log('✅ Header visible:', await header.innerText());

    // ✅ Expect a “Sign Up” or “Join” / call-to-action button
    const signUpBtn = page.getByRole('button', { name: /Sign Up|Join|Get Started|Continue/i });
    await expect(signUpBtn).toBeVisible({ timeout: 10000 });
    console.log('✅ Sign Up / CTA button visible');

    // (Optional) Validate some descriptive text or steps
    const description = page.locator('text=/journey|begin your journey|next steps/i');
    await expect(description).toBeVisible({ timeout: 8000 });
    console.log('✅ Description or instruction text present');

    // (Optional) Click the sign up button and assert next navigation
    // await signUpBtn.click();
    // await page.waitForURL('**/some-next-path', { timeout: 10000 });
    // console.log('✅ Navigated to next path after sign up click');
  });
});
