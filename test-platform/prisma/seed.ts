import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const SAMPLE_CODE = `import { test, expect } from '@playwright/test';

test.describe('End to End Tests', () => {
  test('should load the homepage and verify elements', async ({ page }) => {
    // Step 1: Navigate to the application
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Step 2: Verify the page title
    const title = await page.title();
    console.info('Page title:', title);
    expect(title).toBeTruthy();

    // Step 3: Check for main navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Step 4: Verify main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Step 5: Check for interactive elements
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    console.info(\`Found \${buttonCount} buttons\`);
    expect(buttonCount).toBeGreaterThan(0);

    // Step 6: Take screenshot
    await page.screenshot({ path: 'test-results/screenshot.png' });
  });
});`;

async function main() {
  console.log("Seeding database...");

  // Create tests
  const test1 = await prisma.test.create({
    data: {
      name: "Homepage E2E Test",
      status: "READY",
      instructions: "Test the homepage end to end - verify navigation, content, buttons, and no console errors",
      generatedCode: SAMPLE_CODE,
      baseUrl: "https://example.com",
      notificationSetting: "DEFAULT",
      processingSteps: {
        create: [
          { stepIndex: 0, title: "Analyzing instructions", status: "completed" },
          { stepIndex: 1, title: "Generating test plan", status: "completed" },
          { stepIndex: 2, title: "Writing test code", status: "completed" },
          { stepIndex: 3, title: "Validating test", status: "completed" },
          { stepIndex: 4, title: "Finalizing", status: "completed" },
        ],
      },
    },
  });

  const test2 = await prisma.test.create({
    data: {
      name: "Login Flow Test",
      status: "READY",
      instructions: "Test the login flow - enter credentials, submit form, verify redirect to dashboard",
      generatedCode: SAMPLE_CODE.replace("End to End Tests", "Login Flow").replace("example.com", "example.com/login"),
      baseUrl: "https://example.com",
      schedule: "daily",
      notificationSetting: "DEFAULT",
      processingSteps: {
        create: [
          { stepIndex: 0, title: "Analyzing instructions", status: "completed" },
          { stepIndex: 1, title: "Generating test plan", status: "completed" },
          { stepIndex: 2, title: "Writing test code", status: "completed" },
          { stepIndex: 3, title: "Validating test", status: "completed" },
          { stepIndex: 4, title: "Finalizing", status: "completed" },
        ],
      },
    },
  });

  const test3 = await prisma.test.create({
    data: {
      name: "API Integration Test",
      status: "PROCESSING",
      instructions: "Test the API integration - verify CRUD operations on the /api/items endpoint",
      baseUrl: "https://api.example.com",
      notificationSetting: "OFF",
      processingSteps: {
        create: [
          { stepIndex: 0, title: "Analyzing instructions", status: "completed" },
          { stepIndex: 1, title: "Generating test plan", status: "completed" },
          { stepIndex: 2, title: "Writing test code", status: "running" },
          { stepIndex: 3, title: "Validating test", status: "pending" },
          { stepIndex: 4, title: "Finalizing", status: "pending" },
        ],
      },
    },
  });

  const test4 = await prisma.test.create({
    data: {
      name: "Checkout Flow",
      status: "FAILED",
      instructions: "Test the complete checkout flow from cart to payment confirmation",
      baseUrl: "https://shop.example.com",
      notificationSetting: "CUSTOM",
      processingSteps: {
        create: [
          { stepIndex: 0, title: "Analyzing instructions", status: "completed" },
          { stepIndex: 1, title: "Generating test plan", status: "completed" },
          { stepIndex: 2, title: "Writing test code", status: "failed" },
          { stepIndex: 3, title: "Validating test", status: "pending" },
          { stepIndex: 4, title: "Finalizing", status: "pending" },
        ],
      },
    },
  });

  // Create runs for test1
  const run1 = await prisma.run.create({
    data: {
      testId: test1.id,
      status: "PASSED",
      duration: 4523,
      startedAt: new Date("2026-03-12T10:00:00Z"),
      completedAt: new Date("2026-03-12T10:00:04Z"),
      consoleOutput: [
        "[2026-03-12T10:00:00.000Z] INFO: Starting test execution",
        "[2026-03-12T10:00:00.500Z] INFO: Navigating to https://example.com",
        "[2026-03-12T10:00:01.200Z] DEBUG: Page loaded successfully",
        "[2026-03-12T10:00:01.500Z] INFO: Page title: Example Domain",
        "[2026-03-12T10:00:02.000Z] DEBUG: Navigation element found",
        "[2026-03-12T10:00:02.500Z] INFO: Found 3 buttons on the page",
        "[2026-03-12T10:00:03.000Z] DEBUG: Tab navigation working",
        "[2026-03-12T10:00:03.500Z] INFO: No console errors detected",
        "[2026-03-12T10:00:04.000Z] INFO: Test completed successfully",
      ].join("\n"),
      steps: {
        create: [
          { stepIndex: 0, action: "Navigate to homepage", selector: null, status: "PASSED", duration: 1200 },
          { stepIndex: 1, action: "Verify page title", selector: "title", status: "PASSED", duration: 300 },
          { stepIndex: 2, action: "Check navigation", selector: "role=navigation", status: "PASSED", duration: 500 },
          { stepIndex: 3, action: "Verify main content", selector: "main", status: "PASSED", duration: 400 },
          { stepIndex: 4, action: "Check buttons", selector: "role=button", status: "PASSED", duration: 600 },
          { stepIndex: 5, action: "Test keyboard nav", selector: null, status: "PASSED", duration: 800 },
          { stepIndex: 6, action: "Check console errors", selector: null, status: "PASSED", duration: 500 },
          { stepIndex: 7, action: "Take screenshot", selector: null, status: "PASSED", duration: 223 },
        ],
      },
    },
  });

  const run2 = await prisma.run.create({
    data: {
      testId: test1.id,
      status: "FAILED",
      duration: 2100,
      startedAt: new Date("2026-03-11T14:00:00Z"),
      completedAt: new Date("2026-03-11T14:00:02Z"),
      errorMessage: "TimeoutError: page.waitForLoadState: Timeout 30000ms exceeded.\n\nCall log:\n  - waiting for load state 'networkidle'",
      consoleOutput: [
        "[2026-03-11T14:00:00.000Z] INFO: Starting test execution",
        "[2026-03-11T14:00:00.500Z] INFO: Navigating to https://example.com",
        "[2026-03-11T14:00:02.000Z] ERROR: TimeoutError: page.waitForLoadState timeout",
      ].join("\n"),
      steps: {
        create: [
          { stepIndex: 0, action: "Navigate to homepage", selector: null, status: "PASSED", duration: 1200 },
          { stepIndex: 1, action: "Wait for network idle", selector: null, status: "FAILED", duration: 900, error: "TimeoutError: Timeout 30000ms exceeded" },
          { stepIndex: 2, action: "Verify page title", selector: "title", status: "CANCELLED" },
        ],
      },
    },
  });

  // Create run for test2
  await prisma.run.create({
    data: {
      testId: test2.id,
      status: "PASSED",
      duration: 6200,
      startedAt: new Date("2026-03-12T08:00:00Z"),
      completedAt: new Date("2026-03-12T08:00:06Z"),
      consoleOutput: "[2026-03-12T08:00:00.000Z] INFO: Login flow test started\n[2026-03-12T08:00:06.000Z] INFO: Test passed",
      steps: {
        create: [
          { stepIndex: 0, action: "Navigate to login page", status: "PASSED", duration: 1500 },
          { stepIndex: 1, action: "Fill email field", selector: "input[name=email]", value: "user@test.com", status: "PASSED", duration: 200 },
          { stepIndex: 2, action: "Fill password field", selector: "input[name=password]", value: "***", status: "PASSED", duration: 200 },
          { stepIndex: 3, action: "Click submit button", selector: "button[type=submit]", status: "PASSED", duration: 300 },
          { stepIndex: 4, action: "Verify redirect to dashboard", selector: null, status: "PASSED", duration: 4000 },
        ],
      },
    },
  });

  // Create secrets
  await prisma.testSecret.createMany({
    data: [
      { testId: test1.id, key: "API_KEY", value: "sk_test_abc123def456" },
      { testId: test1.id, key: "AUTH_TOKEN", value: "eyJhbGciOiJIUzI1NiJ9.token" },
      { testId: test2.id, key: "LOGIN_EMAIL", value: "admin@example.com" },
      { testId: test2.id, key: "LOGIN_PASSWORD", value: "SecurePass123!" },
      { key: "GLOBAL_API_KEY", value: "glb_key_xyz789" },
    ],
  });

  // Create a suite
  const suite = await prisma.suite.create({
    data: {
      name: "Smoke Tests",
      description: "Critical path smoke tests to verify core functionality",
      tests: {
        create: [
          { testId: test1.id, order: 0 },
          { testId: test2.id, order: 1 },
        ],
      },
    },
  });

  // Create suite run
  await prisma.suiteRun.create({
    data: {
      suiteId: suite.id,
      status: "PASSED",
      startedAt: new Date("2026-03-12T10:00:00Z"),
      completedAt: new Date("2026-03-12T10:00:10Z"),
    },
  });

  // Create settings
  await prisma.setting.createMany({
    data: [
      { key: "appName", value: "TestPlatform" },
      { key: "defaultBaseUrl", value: "https://example.com" },
      { key: "browser", value: "chromium" },
      { key: "viewportWidth", value: "1280" },
      { key: "viewportHeight", value: "720" },
      { key: "timeout", value: "30000" },
      { key: "headless", value: "true" },
      { key: "parallel", value: "false" },
      { key: "maxWorkers", value: "4" },
    ],
  });

  // Create API token
  await prisma.apiToken.create({
    data: {
      name: "Development Token",
      token: "tp_dev_" + Math.random().toString(36).substring(2, 18),
      lastUsed: new Date("2026-03-10T15:30:00Z"),
    },
  });

  console.log("Seed data created successfully!");
  console.log(`  Tests: 4 (${test1.id}, ${test2.id}, ${test3.id}, ${test4.id})`);
  console.log(`  Runs: 3`);
  console.log(`  Secrets: 5`);
  console.log(`  Suites: 1 (${suite.id})`);
  console.log(`  Settings: 9`);
  console.log(`  API Tokens: 1`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
