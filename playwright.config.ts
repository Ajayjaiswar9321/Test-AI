import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./workspace/generated",
  timeout: 30000,
  retries: 0,
  reporter: "list",
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 720 },
    screenshot: "on",
    trace: "on-first-retry",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  outputDir: "./test-results",
});
