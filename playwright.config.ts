import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // your test files directory
  timeout: 90_000, // 90 seconds per test
  retries: 0, // set 1 if you want to retry flaky tests
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000', // your local dev server
    storageState: 'storage/logged-in.json', // saved login state
    headless: true, // run in headless mode by default
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure', // record videos for failed tests
    screenshot: 'only-on-failure', // capture screenshots on failures
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
