// RAG Knowledge Base for Test AI - Playwright & QA Testing
// Each entry has keywords for retrieval and content for LLM context

export interface KnowledgeEntry {
  topic: string;
  keywords: string[];
  content: string;
}

export const QA_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    topic: "playwright-locators",
    keywords: ["locator", "selector", "find", "element", "getby", "role", "text", "testid", "css", "xpath", "locate"],
    content: `## Playwright Locators (Best Practices)
Recommended priority order:
1. page.getByRole('button', { name: 'Submit' }) - most resilient, uses ARIA roles
2. page.getByText('Welcome') - finds by visible text
3. page.getByLabel('Email') - for form inputs by label
4. page.getByPlaceholder('Enter email') - by placeholder text
5. page.getByTestId('login-btn') - by data-testid attribute
6. page.locator('css=.class') - CSS selector (less stable)
7. page.locator('xpath=//div') - XPath (least recommended)

Chaining: page.getByRole('dialog').getByRole('button', { name: 'OK' })
Filtering: page.getByRole('listitem').filter({ hasText: 'Product' })
nth: page.getByRole('button').nth(2) or .first() or .last()

Common mistakes: Using fragile CSS selectors like .btn-primary instead of role-based. Always prefer semantic locators.`
  },
  {
    topic: "playwright-assertions",
    keywords: ["assert", "expect", "verify", "check", "should", "assertion", "tobe", "tohave", "truthy", "visible"],
    content: `## Playwright Assertions
Web-first assertions auto-retry until timeout (default 5s):

// Visibility
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();

// Text
await expect(locator).toHaveText('exact text');
await expect(locator).toContainText('partial');
await expect(locator).toHaveValue('input value');

// Page
await expect(page).toHaveTitle(/Dashboard/);
await expect(page).toHaveURL(/\\/dashboard/);

// Count & Attributes
await expect(locator).toHaveCount(5);
await expect(locator).toHaveAttribute('href', '/home');
await expect(locator).toHaveClass(/active/);
await expect(locator).toHaveCSS('color', 'rgb(0, 0, 0)');

// Screenshots
await expect(page).toHaveScreenshot('baseline.png');

Soft assertions (don't stop test): expect.soft(locator).toBeVisible();
Custom message: await expect(locator, 'Login button should be visible').toBeVisible();`
  },
  {
    topic: "playwright-actions",
    keywords: ["click", "fill", "type", "press", "hover", "drag", "drop", "check", "select", "upload", "action", "interact"],
    content: `## Playwright Actions
All actions auto-wait for element to be actionable.

// Click
await locator.click();
await locator.dblclick();
await locator.click({ button: 'right' });
await locator.click({ modifiers: ['Shift'] });

// Form Input
await locator.fill('text'); // clears then types
await locator.type('text'); // types character by character (deprecated, use fill)
await locator.clear();
await locator.press('Enter');
await locator.pressSequentially('hello', { delay: 100 });

// Checkbox & Radio
await locator.check();
await locator.uncheck();
await locator.setChecked(true);

// Select
await locator.selectOption('value');
await locator.selectOption({ label: 'Option' });

// Hover & Focus
await locator.hover();
await locator.focus();

// File Upload
await locator.setInputFiles('file.pdf');
await locator.setInputFiles(['file1.pdf', 'file2.pdf']);

// Drag and Drop
await locator.dragTo(target);`
  },
  {
    topic: "playwright-waits",
    keywords: ["wait", "timeout", "loading", "slow", "async", "networkidle", "domcontent", "load", "delay", "flaky"],
    content: `## Waiting Strategies in Playwright
Playwright auto-waits before actions. Avoid waitForTimeout (anti-pattern).

// Page load states
await page.waitForLoadState('networkidle'); // no network activity for 500ms
await page.waitForLoadState('domcontentloaded');
await page.waitForLoadState('load');

// Wait for element
await page.waitForSelector('.modal');
await locator.waitFor({ state: 'visible' });
await locator.waitFor({ state: 'hidden' }); // wait for disappear

// Wait for navigation
await page.waitForURL('**/dashboard');
await Promise.all([page.waitForNavigation(), button.click()]);

// Wait for network
await page.waitForResponse('**/api/data');
await page.waitForRequest('**/api/submit');
const [response] = await Promise.all([
  page.waitForResponse(r => r.url().includes('/api') && r.status() === 200),
  button.click()
]);

// Wait for function
await page.waitForFunction(() => document.title.includes('Dashboard'));

// ANTI-PATTERNS (avoid):
// await page.waitForTimeout(3000); // flaky, slow
// Use event-based waits instead!`
  },
  {
    topic: "playwright-network",
    keywords: ["network", "intercept", "mock", "api", "request", "response", "route", "fetch", "xhr", "stub", "block"],
    content: `## Network Interception & Mocking
// Mock API response
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Test' }])
  });
});

// Modify request
await page.route('**/api/**', route => {
  route.continue({ headers: { ...route.request().headers(), 'X-Test': 'true' } });
});

// Block resources (speed up tests)
await page.route('**/*.{png,jpg,jpeg,gif}', route => route.abort());

// Monitor network
page.on('request', req => console.log(req.method(), req.url()));
page.on('response', res => console.log(res.status(), res.url()));

// API Testing (Playwright's request fixture)
const response = await request.get('/api/users');
expect(response.ok()).toBeTruthy();
const data = await response.json();`
  },
  {
    topic: "playwright-auth",
    keywords: ["auth", "login", "session", "cookie", "token", "storage", "signin", "authenticate", "credential", "password"],
    content: `## Authentication in Playwright
// Global setup - login once, reuse state
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    { name: 'tests', dependencies: ['setup'], use: { storageState: '.auth/user.json' } }
  ]
});

// auth.setup.ts
import { test as setup } from '@playwright/test';
setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@test.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: '.auth/user.json' });
});

// Reuse cookies/localStorage across tests without re-login.
// For API auth: use request.storageState() or set headers globally.`
  },
  {
    topic: "playwright-pom",
    keywords: ["page object", "pom", "model", "pattern", "class", "reusable", "organize", "structure", "architecture", "design"],
    content: `## Page Object Model (POM)
// pages/login.page.ts
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

// In test:
test('login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'pass123');
  await expect(page).toHaveURL('/dashboard');
});`
  },
  {
    topic: "playwright-config",
    keywords: ["config", "configuration", "setup", "browser", "headless", "parallel", "workers", "retry", "reporter", "project", "timeout"],
    content: `## Playwright Configuration
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }
});`
  },
  {
    topic: "playwright-debugging",
    keywords: ["debug", "inspect", "trace", "error", "breakpoint", "pause", "headed", "slow", "step", "viewer"],
    content: `## Debugging Playwright Tests
// 1. Debug mode (opens inspector)
// npx playwright test --debug

// 2. Pause in test
await page.pause(); // opens Playwright Inspector

// 3. Headed mode (see browser)
// npx playwright test --headed

// 4. Slow motion
// npx playwright test --headed --slow-mo=1000

// 5. Trace viewer
// playwright.config.ts: use: { trace: 'on' }
// npx playwright show-trace trace.zip

// 6. Screenshots at any point
await page.screenshot({ path: 'debug.png', fullPage: true });

// 7. Console output
console.log(await locator.innerHTML());
console.log(await locator.textContent());
console.log(await page.title());

// 8. Evaluate in browser
const text = await page.evaluate(() => document.body.innerText);

// 9. UI Mode (interactive)
// npx playwright test --ui

// 10. VS Code Extension - set breakpoints, step through tests`
  },
  {
    topic: "playwright-fixtures",
    keywords: ["fixture", "hook", "before", "after", "setup", "teardown", "beforeeach", "aftereach", "beforeall", "extend"],
    content: `## Test Fixtures & Hooks
// Built-in fixtures: page, context, browser, request, browserName

// Custom fixtures
import { test as base, expect } from '@playwright/test';
const test = base.extend<{ todoPage: TodoPage }>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
    // cleanup after test
  },
});

// Hooks
test.beforeAll(async () => { /* run once before all tests in file */ });
test.beforeEach(async ({ page }) => { await page.goto('/'); });
test.afterEach(async ({ page }) => { /* cleanup */ });
test.afterAll(async () => { /* cleanup once */ });

// Test groups
test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/login'); });
  test('valid login', async ({ page }) => { /* ... */ });
  test('invalid login', async ({ page }) => { /* ... */ });
});`
  },
  {
    topic: "playwright-api-testing",
    keywords: ["api", "rest", "postman", "endpoint", "get", "post", "put", "delete", "status", "json", "request"],
    content: `## API Testing with Playwright
import { test, expect } from '@playwright/test';

test('GET /api/users', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  const users = await response.json();
  expect(users.length).toBeGreaterThan(0);
  expect(users[0]).toHaveProperty('email');
});

test('POST /api/users', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'Test', email: 'test@test.com' },
    headers: { 'Authorization': 'Bearer token123' }
  });
  expect(response.status()).toBe(201);
  const user = await response.json();
  expect(user.name).toBe('Test');
});

test('PUT /api/users/:id', async ({ request }) => {
  const response = await request.put('/api/users/1', {
    data: { name: 'Updated' }
  });
  expect(response.ok()).toBeTruthy();
});

test('DELETE /api/users/:id', async ({ request }) => {
  const response = await request.delete('/api/users/1');
  expect(response.status()).toBe(204);
});`
  },
  {
    topic: "playwright-visual-testing",
    keywords: ["visual", "screenshot", "snapshot", "compare", "pixel", "regression", "image", "baseline", "diff"],
    content: `## Visual Regression Testing
// Compare screenshots against baseline
await expect(page).toHaveScreenshot('homepage.png');
await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixels: 100 });
await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.02 });

// Element screenshot comparison
await expect(locator).toHaveScreenshot('button.png');

// Full page screenshot
await expect(page).toHaveScreenshot({ fullPage: true });

// Update baselines: npx playwright test --update-snapshots

// Configuration
use: {
  screenshot: 'only-on-failure',
  // or 'on' for every test
}

// Custom comparison
const screenshot = await page.screenshot();
await expect(screenshot).toMatchSnapshot('expected.png', { threshold: 0.3 });`
  },
  {
    topic: "playwright-mobile-responsive",
    keywords: ["mobile", "responsive", "viewport", "device", "emulation", "tablet", "iphone", "android", "screen", "breakpoint"],
    content: `## Mobile & Responsive Testing
import { devices } from '@playwright/test';

// In config - test on multiple devices
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Tablet', use: { ...devices['iPad (gen 7)'] } },
]

// Dynamic viewport in test
await page.setViewportSize({ width: 375, height: 812 });
await page.setViewportSize({ width: 1920, height: 1080 });

// Check responsive behavior
test('mobile menu appears on small screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const hamburger = page.getByRole('button', { name: 'Menu' });
  await expect(hamburger).toBeVisible();
  await hamburger.click();
  await expect(page.getByRole('navigation')).toBeVisible();
});

// Check no horizontal overflow
const hasOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth
);
expect(hasOverflow).toBe(false);`
  },
  {
    topic: "playwright-accessibility",
    keywords: ["accessibility", "a11y", "aria", "wcag", "screen reader", "alt", "label", "role", "semantic", "keyboard"],
    content: `## Accessibility Testing
// Check ARIA roles and labels
await expect(page.getByRole('navigation')).toBeVisible();
await expect(page.getByRole('main')).toBeVisible();

// Images should have alt text
const images = page.locator('img');
for (const img of await images.all()) {
  const alt = await img.getAttribute('alt');
  expect(alt).toBeTruthy();
}

// Form inputs should have labels
const inputs = page.locator('input:not([type="hidden"])');
for (const input of await inputs.all()) {
  const id = await input.getAttribute('id');
  const ariaLabel = await input.getAttribute('aria-label');
  const label = id ? page.locator(\`label[for="\${id}"]\`) : null;
  const hasLabel = ariaLabel || (label && await label.count() > 0);
  expect(hasLabel).toBeTruthy();
}

// Keyboard navigation
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => document.activeElement?.tagName);

// Color contrast, heading hierarchy (use axe-core for full audit)
// npm install @axe-core/playwright
// import AxeBuilder from '@axe-core/playwright';
// const results = await new AxeBuilder({ page }).analyze();
// expect(results.violations).toEqual([]);`
  },
  {
    topic: "playwright-ci-cd",
    keywords: ["ci", "cd", "pipeline", "github", "actions", "jenkins", "docker", "container", "deploy", "automate", "continuous"],
    content: `## CI/CD Integration
# GitHub Actions (.github/workflows/playwright.yml)
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

# Docker
FROM mcr.microsoft.com/playwright:v1.48.0-jammy
WORKDIR /app
COPY . .
RUN npm ci
RUN npx playwright test

# Tips:
# - Use retries: 2 in CI
# - Set workers: 1 for stability
# - Upload trace files on failure
# - Use sharding for large test suites:
#   npx playwright test --shard=1/4`
  },
  {
    topic: "playwright-frames",
    keywords: ["frame", "iframe", "embed", "nested", "shadow", "dom", "shadow dom", "component"],
    content: `## Frames, iframes & Shadow DOM
// Working with iframes
const frame = page.frameLocator('#my-iframe');
await frame.getByRole('button', { name: 'Submit' }).click();

// Nested iframes
const nested = page.frameLocator('#outer').frameLocator('#inner');

// Shadow DOM - Playwright pierces shadow DOM by default
await page.locator('my-component').getByRole('button').click();

// If needed, explicit shadow DOM access
const shadow = page.locator('my-component >> shadow=.inner-button');`
  },
  {
    topic: "test-strategy",
    keywords: ["strategy", "plan", "coverage", "smoke", "regression", "sanity", "suite", "priority", "risk", "test plan"],
    content: `## Test Strategy & Planning
Test Pyramid:
1. Unit Tests (70%) - Fast, isolated, test functions/components
2. Integration Tests (20%) - Test API endpoints, DB queries
3. E2E Tests (10%) - Critical user journeys via Playwright

Test Types:
- Smoke Tests: Quick health check - login, homepage loads, critical CTA works
- Sanity Tests: Focused check after a specific change
- Regression Tests: Full suite - all features, edge cases, cross-browser
- Exploratory Tests: Manual/creative testing for edge cases

Prioritization (Risk-Based):
- HIGH: Auth flows, payment, data mutations, core user journey
- MEDIUM: Search, filtering, form validation, error handling
- LOW: Static pages, tooltips, animations, footer links

Coverage Goals:
- Happy path for all critical features
- Error handling for user-facing forms
- Cross-browser (Chrome, Firefox, Safari)
- Mobile responsive for top 3 breakpoints
- Accessibility basics (WCAG 2.1 AA)`
  },
  {
    topic: "playwright-performance",
    keywords: ["performance", "speed", "fast", "slow", "optimize", "load", "time", "metrics", "lighthouse", "core web vitals"],
    content: `## Performance Testing
// Measure page load time
const startTime = Date.now();
await page.goto('/');
await page.waitForLoadState('networkidle');
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(3000);

// Web Vitals via Performance API
const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  return {
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    fullLoad: Math.round(nav.loadEventEnd - nav.startTime),
    domInteractive: Math.round(nav.domInteractive - nav.startTime)
  };
});

// Check no failed network requests
const failedRequests: string[] = [];
page.on('response', res => {
  if (res.status() >= 400) failedRequests.push(res.url());
});
await page.goto('/');
expect(failedRequests).toHaveLength(0);

// Resource count
const resources = await page.evaluate(() => performance.getEntriesByType('resource').length);`
  },
  {
    topic: "playwright-parallel",
    keywords: ["parallel", "concurrent", "shard", "worker", "scale", "fast", "speed", "serial"],
    content: `## Parallel & Serial Execution
// Parallel (default) - tests run in parallel across workers
// playwright.config.ts: fullyParallel: true

// Serial - force sequential within a describe block
test.describe.serial('checkout flow', () => {
  test('add to cart', async ({ page }) => { /* ... */ });
  test('enter shipping', async ({ page }) => { /* ... */ });
  test('payment', async ({ page }) => { /* ... */ });
});

// Configure workers
// playwright.config.ts: workers: 4
// CLI: npx playwright test --workers=4

// Sharding (split across machines)
// npx playwright test --shard=1/4
// npx playwright test --shard=2/4

// Test isolation - each test gets fresh browser context
// Tests should NOT depend on each other's state
// Use fixtures for shared setup, not test ordering`
  },
  {
    topic: "common-errors",
    keywords: ["error", "fail", "timeout", "strict", "multiple", "detach", "stale", "crash", "hang", "fix", "broken", "not working"],
    content: `## Common Playwright Errors & Fixes

1. TimeoutError: locator.click: Timeout 30000ms exceeded
   Fix: Element not found. Check selector, add waitFor, increase timeout, or use a more specific locator.

2. Error: strict mode violation - locator resolved to N elements
   Fix: Your locator matches multiple elements. Use .first(), .nth(n), or make the locator more specific.

3. Element is not visible
   Fix: Element exists in DOM but hidden. Wait for animation, scroll into view, or check CSS display/visibility.

4. Navigation interrupted
   Fix: Page navigated during an action. Use Promise.all([page.waitForNavigation(), button.click()]).

5. Target closed
   Fix: Browser/page closed unexpectedly. Check for redirects, popups, or test cleanup issues.

6. Test isolation failure
   Fix: Tests sharing state. Use fresh context per test, avoid global variables.

7. Flaky tests
   Fix: Replace waitForTimeout with proper waits. Use web-first assertions. Add retry in config.

8. page.evaluate errors
   Fix: Code inside evaluate runs in browser context. Can't access Node.js variables directly. Pass them as arguments: page.evaluate((arg) => {}, myVar).`
  },
  {
    topic: "testing-best-practices",
    keywords: ["best practice", "tips", "improve", "better", "quality", "clean", "maintainable", "good", "standard", "convention"],
    content: `## Testing Best Practices

1. Write independent tests - each test should work alone
2. Use descriptive test names - describe WHAT is tested and expected outcome
3. Follow AAA pattern - Arrange, Act, Assert
4. One assertion concept per test - test one behavior
5. Use Page Object Model for reusable page interactions
6. Never hard-code waits - use event-based waiting
7. Use semantic locators - getByRole > getByTestId > CSS selectors
8. Handle test data properly - create/cleanup in beforeEach/afterEach
9. Tag tests for selective runs - test.describe('smoke', ...)
10. Keep tests fast - mock external APIs, parallelize
11. Use visual regression for UI-heavy apps
12. Test error states, not just happy paths
13. Run tests in CI on every PR
14. Review test code like production code
15. Don't test implementation details - test user behavior`
  },
  {
    topic: "playwright-file-operations",
    keywords: ["file", "upload", "download", "pdf", "csv", "excel", "image", "attachment"],
    content: `## File Upload & Download
// Upload file
await page.getByLabel('Upload').setInputFiles('test-file.pdf');
await page.getByLabel('Upload').setInputFiles(['file1.pdf', 'file2.pdf']);

// Upload via drag-and-drop
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByText('Drop files here').click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('myfile.pdf');

// Download
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByText('Download Report').click()
]);
const path = await download.path();
const filename = download.suggestedFilename();
await download.saveAs('./downloads/' + filename);

// Verify download content
const stream = await download.createReadStream();`
  },
  {
    topic: "playwright-dialog",
    keywords: ["dialog", "alert", "confirm", "prompt", "popup", "modal", "window", "tab", "new window"],
    content: `## Dialogs, Popups & Multiple Pages
// Handle alert/confirm/prompt
page.on('dialog', async dialog => {
  console.log(dialog.message());
  await dialog.accept(); // or dialog.dismiss()
});

// Handle confirm with specific response
page.on('dialog', dialog => dialog.accept('my answer'));

// New tab/window
const [newPage] = await Promise.all([
  context.waitForEvent('page'),
  page.getByText('Open new tab').click()
]);
await newPage.waitForLoadState();
await expect(newPage).toHaveURL(/new-page/);

// Multiple browser contexts (isolated sessions)
const context1 = await browser.newContext();
const context2 = await browser.newContext();
const page1 = await context1.newPage();
const page2 = await context2.newPage();`
  },
];

// RAG retrieval function - finds relevant knowledge for a query
export function retrieveContext(query: string, topK = 3): string {
  const queryWords = query.toLowerCase().split(/\s+/);

  const scored = QA_KNOWLEDGE_BASE.map(entry => {
    let score = 0;
    for (const word of queryWords) {
      for (const kw of entry.keywords) {
        if (word.includes(kw) || kw.includes(word)) {
          score += word === kw ? 3 : 1; // exact match scores higher
        }
      }
      // Also check topic name
      if (entry.topic.toLowerCase().includes(word)) score += 2;
    }
    return { entry, score };
  });

  const relevant = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (relevant.length === 0) return "";

  return relevant.map(r => r.entry.content).join("\n\n---\n\n");
}
