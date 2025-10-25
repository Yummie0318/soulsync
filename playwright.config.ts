import { defineConfig, devices } from "@playwright/test";
import fs from "fs";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  retries: 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    storageState: fs.existsSync("storage/logged-in.json")
      ? "storage/logged-in.json"
      : undefined,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

webServer: {
  command: "npm run start",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI, // reuse local server in dev
  timeout: 120 * 1000, // give time to build b
},

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
