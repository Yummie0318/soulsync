import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',           // all .spec.ts files
  timeout: 90_000,              // 90s per test for CI stability
  retries: 0,                   // optional: set 1 if flaky tests
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',     // capture trace only on failure
    screenshot: 'only-on-failure',  // capture screenshot only on failure
    video: 'retain-on-failure',     // capture video only on failure
    headless: true,                 // run headless in CI
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Desktop Firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  workers: process.env.CI ? 1 : undefined, // run sequentially on CI
});
