import { test, expect } from '@playwright/test';

test.describe('SoulSyncAI — Feelings Quiz + Sign Up Flow', () => {
  test('should select a feeling and successfully reach the signup page', async ({ page }) => {
    test.setTimeout(40000);

    const URL = 'https://www.soulsyncai.site/en/login/feelings-quiz';
    console.log(`🌐 Navigating to ${URL}...`);
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    // ✅ Wait for quiz question
    console.log('⏳ Waiting for quiz question "How are you feeling?" to appear...');
    await expect(page.getByText('How are you feeling', { exact: false })).toBeVisible({ timeout: 10000 });

    // ✅ Select one of the available feelings
    const feelings = page.locator(`
      button:has-text("😊"),
      button:has-text("😟"),
      button:has-text("😌"),
      button:has-text("😍"),
      button:has-text("😁"),
      button:has-text("Happy"),
      button:has-text("Sad"),
      button:has-text("Calm"),
      button:has-text("In Love"),
      button:has-text("Excited"),
      button:has-text("Anxious")
    `);

    await expect(feelings.first()).toBeVisible({ timeout: 10000 });
    console.log('💛 Selecting the first available feeling option...');
    await feelings.first().click();

    // ✅ Wait for redirect to "Journey Begin" page
    console.log('⏳ Waiting for redirect to journey-begin page...');
    await page.waitForURL('**/login/journey-begin', { timeout: 20000 });

    // ✅ Verify success page elements
    const journeyHeader = page.getByText('Your Journey', { exact: false });
    const signUpButton = page.getByRole('button', { name: /Sign Up/i });

    await expect(journeyHeader).toBeVisible({ timeout: 10000 });
    await expect(signUpButton).toBeVisible({ timeout: 10000 });

    console.log('✅ Successfully reached the Sign-Up page after selecting a feeling.');
  });
});
