import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Go to login page (replace locale if needed)
  await page.goto('http://localhost:3000/en/login');

  // Fill in your test account credentials
  await page.fill('input[name="email"]', 'joylynmadriagats@gmail.com');
  await page.fill('input[name="password"]', 'JRMadriaga97');

  // Click login
  await page.click('button[type="submit"]');

  // Wait until redirected after login
  await page.waitForURL('http://localhost:3000/en/*');

  // Save storage state for future tests
  await page.context().storageState({ path: 'storage/logged-in.json' });
  console.log('✅ storage/logged-in.json has been created!');

  await browser.close();
})();
