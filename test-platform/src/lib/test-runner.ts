import { prisma } from "./prisma";

const SAMPLE_CODE = `import { test, expect } from '@playwright/test';

test.describe('End to End Tests', () => {
  test('should load the homepage and verify elements', async ({ page }) => {
    // Step 1: Navigate to the application
    await page.goto('{BASE_URL}');
    await page.waitForLoadState('networkidle');

    // Step 2: Verify the page title
    const title = await page.title();
    console.info('Page title:', title);
    expect(title).toBeTruthy();

    // Step 3: Check for main navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    console.debug('Navigation element found');

    // Step 4: Verify main content area
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Step 5: Check for interactive elements
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    console.info(\`Found \${buttonCount} buttons on the page\`);
    expect(buttonCount).toBeGreaterThan(0);

    // Step 6: Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.debug('Focused element:', focusedElement);

    // Step 7: Verify no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);

    // Step 8: Take a final screenshot
    await page.screenshot({ path: 'test-results/final-screenshot.png' });
    console.info('Test completed successfully');
  });
});`;

export async function simulateProcessing(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { processingSteps: { orderBy: { stepIndex: "asc" } } },
  });
  if (!test) return;

  // Simulate each processing step
  for (const step of test.processingSteps) {
    await prisma.processingStep.update({
      where: { id: step.id },
      data: { status: "running" },
    });

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    await prisma.processingStep.update({
      where: { id: step.id },
      data: { status: "completed" },
    });
  }

  // Generate code and mark as ready
  const code = SAMPLE_CODE.replace("{BASE_URL}", test.baseUrl || "http://localhost:3000");
  await prisma.test.update({
    where: { id: testId },
    data: {
      status: "READY",
      generatedCode: code,
    },
  });
}

export async function simulateRun(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { steps: { orderBy: { stepIndex: "asc" } } },
  });
  if (!run) return;

  const startTime = Date.now();

  await prisma.run.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const consoleLines: string[] = [];

  for (const step of run.steps) {
    await prisma.runStep.update({
      where: { id: step.id },
      data: { status: "RUNNING" },
    });

    const stepDuration = Math.floor(Math.random() * 2000) + 500;
    await new Promise((resolve) => setTimeout(resolve, 300));

    consoleLines.push(
      `[${new Date().toISOString()}] INFO: Executing step ${step.stepIndex + 1}: ${step.action}`
    );

    await prisma.runStep.update({
      where: { id: step.id },
      data: {
        status: "PASSED",
        duration: stepDuration,
      },
    });

    consoleLines.push(
      `[${new Date().toISOString()}] DEBUG: Step ${step.stepIndex + 1} completed in ${stepDuration}ms`
    );
  }

  const totalDuration = Date.now() - startTime;

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: "PASSED",
      duration: totalDuration,
      completedAt: new Date(),
      consoleOutput: consoleLines.join("\n"),
    },
  });
}
