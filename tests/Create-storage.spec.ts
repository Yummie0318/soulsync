import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const STORAGE_PATH = 'storage/logged-in.json';

// Use secret variables (set in GitHub Actions or local terminal)
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

test('Create storage state for CI login', async ({ browser }) => {
  // 🔒 Verify credentials before proceeding
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('❌ Missing TEST_EMAIL or TEST_PASSWORD in environment variables.');
    throw new Error('Please set TEST_EMAIL and TEST_PASSWORD as GitHub Secrets or local environment variables.');
  }

  // Ensure storage directory exists
  if (!fs.existsSync('storage')) {
    fs.mkdirSync('storage');
  }

  const page = await browser.newPage();
  console.log('🌐 Navigating to login page...');
  await page.goto(`${BASE_URL}/en/login`, { waitUntil: 'domcontentloaded' });

  // Fill credentials from environment
  console.log(`👤 Attempting login with email: ${TEST_EMAIL}`);
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation and verify successful login
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  const currentUrl = page.url();
  console.log('📍 Current URL after login:', currentUrl);

  // Check if still on login page (indicating invalid credentials)
  if (currentUrl.includes('/login')) {
    console.error('❌ Login failed — credentials might be incorrect.');
    throw new Error('Login failed. Please check TEST_EMAIL and TEST_PASSWORD.');
  }

  // Save logged-in session state
  await page.context().storageState({ path: STORAGE_PATH });
  console.log(`✅ Saved session to ${STORAGE_PATH}`);
});
