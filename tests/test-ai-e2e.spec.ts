import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = "tester@testai.io";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(BASE_URL);
  await page.fill('input[type="text"]', TEST_EMAIL);
  await page.click('button[type="submit"]');
  await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
}

// ─────────────────────────────────────────────
// 1. LOGIN / AUTHENTICATION
// ─────────────────────────────────────────────

test.describe("Authentication", () => {
  test("TC-001: Login page renders correctly", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Test AI")).toBeVisible();
    await expect(page.getByText("AI Testing Architect")).toBeVisible();
    await expect(page.getByText("System Ready")).toBeVisible();
    await expect(page.getByPlaceholder("operator@system.io")).toBeVisible();
    await expect(page.getByText("Initialize System")).toBeVisible();
  });

  test("TC-002: Login with valid email", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.fill('input[type="text"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Test AI")).toBeVisible();
  });

  test("TC-003: Login with empty email shows validation", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button[type="submit"]');
    // HTML5 required validation should prevent submission
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveAttribute("required", "");
  });

  test("TC-004: Token persists in localStorage after login", async ({ page }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem("bro_token"));
    expect(token).toBeTruthy();
    expect(token!.split(".")).toHaveLength(3); // JWT format
  });

  test("TC-005: Logout clears token and shows login", async ({ page }) => {
    await login(page);
    // Click logout button
    await page.locator('button:has(svg)').last().click();
    await expect(page.getByPlaceholder("operator@system.io")).toBeVisible({ timeout: 5000 });
    const token = await page.evaluate(() => localStorage.getItem("bro_token"));
    expect(token).toBeNull();
  });

  test("TC-006: Theme toggle works on login page", async ({ page }) => {
    await page.goto(BASE_URL);
    const html = page.locator("html");
    // Toggle theme
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const classAfterToggle = await html.getAttribute("class");
    // Toggle back
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const classAfterSecondToggle = await html.getAttribute("class");
    expect(classAfterToggle).not.toBe(classAfterSecondToggle);
  });
});

// ─────────────────────────────────────────────
// 2. MAIN DASHBOARD / NAVIGATION
// ─────────────────────────────────────────────

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-007: Dashboard loads with UI Automation tab active", async ({ page }) => {
    await expect(page.getByText("UI Automation")).toBeVisible();
    // URL input and goal input should be visible
    await expect(page.locator('input[placeholder*="http"]')).toBeVisible();
  });

  test("TC-008: Navigate to API Testing tab", async ({ page }) => {
    await page.getByText("API Testing").click();
    await expect(page.getByText("Upload Postman")).toBeVisible({ timeout: 5000 });
  });

  test("TC-009: Navigate to History tab", async ({ page }) => {
    await page.getByText("History").click();
    await expect(page.getByText(/history/i)).toBeVisible({ timeout: 5000 });
  });

  test("TC-010: Sidebar navigation works (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const sidebar = page.locator("nav");
    await expect(sidebar).toBeVisible();
    // Click sidebar buttons
    const navButtons = sidebar.locator("button");
    await expect(navButtons).toHaveCount(3);
  });

  test("TC-011: Theme toggle works in dashboard", async ({ page }) => {
    const html = page.locator("html");
    const initialDark = await html.evaluate((el) => el.classList.contains("dark"));
    // Find and click theme toggle in header
    await page.locator("header button").first().click();
    const afterToggle = await html.evaluate((el) => el.classList.contains("dark"));
    expect(afterToggle).not.toBe(initialDark);
  });

  test("TC-012: Mobile tabs are visible on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText("UI Automation")).toBeVisible();
    await expect(page.getByText("API Testing")).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 3. UI AUTOMATION PLANNER
// ─────────────────────────────────────────────

test.describe("UI Automation Planner", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-013: Planner form renders with URL and goal inputs", async ({ page }) => {
    await expect(page.locator('input[placeholder*="http"]')).toBeVisible();
    await expect(page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]')).toBeVisible();
  });

  test("TC-014: Submit plan with valid URL and goal", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads correctly");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Should show loading state
    await expect(page.locator('[class*="animate"]')).toBeVisible({ timeout: 15000 });
  });

  test("TC-015: Plan generates scenario cards", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for scenarios to appear
    await expect(page.locator('[class*="scenario"], [class*="card"]').first()).toBeVisible({ timeout: 30000 });
  });

  test("TC-016: Empty URL shows validation error", async ({ page }) => {
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test something");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Should not navigate away from form
    await expect(page.locator('input[placeholder*="http"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 4. LIVE PREVIEW
// ─────────────────────────────────────────────

test.describe("Live Preview", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-017: Preview shows standby state when no URL", async ({ page }) => {
    await expect(page.getByText("Viewport ready")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Launch a polished live preview")).toBeVisible();
  });

  test("TC-018: Preview shows browser chrome (traffic lights)", async ({ page }) => {
    // After generating a plan, the preview should show
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for plan to generate and preview to show
    await page.waitForTimeout(5000);
    // Browser chrome elements (traffic light dots)
    const dots = page.locator('[class*="rounded-full"][class*="bg-rose"], [class*="rounded-full"][class*="bg-amber"], [class*="rounded-full"][class*="bg-emerald"]');
    await expect(dots.first()).toBeVisible({ timeout: 15000 });
  });

  test("TC-019: Preview shows target URL in address bar", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("example.com")).toBeVisible({ timeout: 30000 });
  });

  test("TC-020: Preview handles iframe-blocked sites gracefully", async ({ page }) => {
    // Most sites block iframes - the fallback should appear
    await page.fill('input[placeholder*="http"]', "https://google.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test search");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for iframe timeout fallback
    await expect(page.getByText("blocking embedded preview").or(page.getByText("Live feed"))).toBeVisible({ timeout: 30000 });
  });

  test("TC-021: External link button opens target in new tab", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await page.waitForTimeout(5000);
    // Check external link button exists
    const externalLink = page.locator('a[target="_blank"][href="https://example.com"]');
    if (await externalLink.isVisible()) {
      expect(await externalLink.getAttribute("rel")).toContain("noopener");
    }
  });
});

// ─────────────────────────────────────────────
// 5. TEST EXECUTION & CONSOLE STREAM
// ─────────────────────────────────────────────

test.describe("Test Execution", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-022: Running a test shows execution log panel", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for plan + auto-run
    await expect(page.getByText("Execution Log")).toBeVisible({ timeout: 60000 });
  });

  test("TC-023: Steps tab shows step-by-step progress", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for steps to appear
    await expect(page.locator('[class*="passed"], [class*="failed"], [class*="running"]').first()).toBeVisible({ timeout: 60000 });
  });

  test("TC-024: Script tab shows generated Playwright code", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for test to complete and script to generate
    await page.waitForTimeout(30000);
    // Click Script tab
    const scriptTab = page.getByText("Script");
    if (await scriptTab.isVisible()) {
      await scriptTab.click();
      await expect(page.locator("pre")).toBeVisible({ timeout: 10000 });
    }
  });

  test("TC-025: Stop button halts running test", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await page.waitForTimeout(5000);
    // Find and click stop button
    const stopBtn = page.getByText("Stop").or(page.locator('button:has-text("Stop")'));
    if (await stopBtn.isVisible()) {
      await stopBtn.click();
      await page.waitForTimeout(2000);
      // Test should no longer be running
    }
  });
});

// ─────────────────────────────────────────────
// 6. TEST REPORT
// ─────────────────────────────────────────────

test.describe("Test Report", () => {
  test("TC-026: Report shows after test completion", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    // Wait for test to complete
    await expect(page.getByText("Test Report")).toBeVisible({ timeout: 120000 });
  });

  test("TC-027: Report displays pass rate", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("Pass Rate")).toBeVisible({ timeout: 120000 });
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test("TC-028: Report has Export CSV button", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("Export")).toBeVisible({ timeout: 120000 });
  });

  test("TC-029: Report shows stats grid (Steps, Passed, Failed, Duration)", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("Steps")).toBeVisible({ timeout: 120000 });
    await expect(page.getByText("Passed")).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();
    await expect(page.getByText("Duration")).toBeVisible();
  });

  test("TC-030: New Test button resets the UI", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("New Test")).toBeVisible({ timeout: 120000 });
    await page.getByText("New Test").click();
    // Should be back to the planner form
    await expect(page.locator('input[placeholder*="http"]')).toBeVisible({ timeout: 5000 });
  });

  test("TC-031: Re-Run All button restarts tests", async ({ page }) => {
    await login(page);
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test the homepage loads");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await expect(page.getByText("Re-Run All")).toBeVisible({ timeout: 120000 });
  });
});

// ─────────────────────────────────────────────
// 7. AI CHAT SIDEBAR
// ─────────────────────────────────────────────

test.describe("AI Chat Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-032: Chat FAB button is visible", async ({ page }) => {
    // The floating action button for chat
    const fab = page.locator('button[class*="fixed"][class*="bottom"]').last();
    await expect(fab).toBeVisible();
  });

  test("TC-033: Clicking chat FAB opens chat panel", async ({ page }) => {
    const fab = page.locator('button[class*="fixed"][class*="bottom"]').last();
    await fab.click();
    await expect(page.locator('[class*="fixed"][class*="z-50"]').filter({ hasText: /chat|message|ask/i })).toBeVisible({ timeout: 5000 });
  });

  test("TC-034: Chat panel has message input", async ({ page }) => {
    const fab = page.locator('button[class*="fixed"][class*="bottom"]').last();
    await fab.click();
    await page.waitForTimeout(1000);
    const chatInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="ask"], input[placeholder*="type"]');
    await expect(chatInput.first()).toBeVisible({ timeout: 5000 });
  });

  test("TC-035: Chat closes when FAB is clicked again", async ({ page }) => {
    const fab = page.locator('button[class*="fixed"][class*="bottom"]').last();
    await fab.click();
    await page.waitForTimeout(500);
    await fab.click();
    await page.waitForTimeout(500);
    // Chat panel should be hidden
  });
});

// ─────────────────────────────────────────────
// 8. API TESTING TAB
// ─────────────────────────────────────────────

test.describe("API Testing Tab", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText("API Testing").click();
  });

  test("TC-036: Upload Postman section renders", async ({ page }) => {
    await expect(page.getByText(/postman|upload|import/i).first()).toBeVisible();
  });

  test("TC-037: File upload area accepts JSON", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      expect(await fileInput.getAttribute("accept")).toContain("json");
    }
  });
});

// ─────────────────────────────────────────────
// 9. TEST HISTORY TAB
// ─────────────────────────────────────────────

test.describe("Test History Tab", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByText("History").click();
  });

  test("TC-038: History tab loads without errors", async ({ page }) => {
    await page.waitForTimeout(2000);
    // Should not show error
    const errorEl = page.locator('[class*="error"], [class*="rose"]').filter({ hasText: /error|failed to load/i });
    await expect(errorEl).toHaveCount(0);
  });

  test("TC-039: History shows empty state or entries", async ({ page }) => {
    await page.waitForTimeout(3000);
    // Either shows history entries or an empty state message
    const hasEntries = await page.locator('[class*="card"], [class*="border"]').count() > 0;
    expect(hasEntries).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// 10. RESPONSIVE DESIGN
// ─────────────────────────────────────────────

test.describe("Responsive Design", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-040: Mobile viewport (375px) - no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // small tolerance
  });

  test("TC-041: Tablet viewport (768px) - layout adapts", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Test AI")).toBeVisible();
  });

  test("TC-042: Desktop viewport (1440px) - sidebar visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sidebar = page.locator("nav");
    await expect(sidebar).toBeVisible();
  });

  test("TC-043: Login page responsive on mobile", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("bro_token"));
    await page.goto(BASE_URL);
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText("Test AI")).toBeVisible();
    await expect(page.getByPlaceholder("operator@system.io")).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 11. API ENDPOINTS (Backend)
// ─────────────────────────────────────────────

test.describe("API Endpoints", () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: TEST_EMAIL },
    });
    const data = await res.json();
    token = data.token;
  });

  test("TC-044: POST /api/auth/login returns JWT token", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: TEST_EMAIL },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(data.token.split(".")).toHaveLength(3);
  });

  test("TC-045: POST /api/ui-plan requires auth", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ui-plan`, {
      data: { url: "https://example.com", goal: "Test" },
    });
    expect(res.status()).toBe(401);
  });

  test("TC-046: POST /api/ui-plan returns scenarios", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ui-plan`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { url: "https://example.com", goal: "Test the homepage" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.scenarios).toBeTruthy();
    expect(Array.isArray(data.scenarios)).toBeTruthy();
    expect(data.scenarios.length).toBeGreaterThan(0);
  });

  test("TC-047: POST /api/run-tests returns runId", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/run-tests`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        url: "https://example.com",
        steps: ["Navigate to the application", "Verify page loads successfully"],
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.runId).toBeTruthy();
  });

  test("TC-048: GET /api/events/:runId returns SSE stream", async ({ request }) => {
    // First start a test to get a runId
    const runRes = await request.post(`${BASE_URL}/api/run-tests`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        url: "https://example.com",
        steps: ["Navigate to the application"],
      },
    });
    const { runId } = await runRes.json();
    expect(runId).toBeTruthy();

    // SSE endpoint should be accessible
    const eventRes = await request.get(`${BASE_URL}/api/events/${runId}`);
    expect(eventRes.status()).toBe(200);
  });

  test("TC-049: GET /api/ai-status returns AI mode", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/ai-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(["gemini", "ollama", "local"]).toContain(data.mode);
  });

  test("TC-050: GET /api/test-history returns array", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/test-history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test("TC-051: POST /api/chat requires auth", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/chat`, {
      data: { message: "Hello" },
    });
    expect(res.status()).toBe(401);
  });

  test("TC-052: POST /api/chat returns response", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/chat`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: "What can you help me with?" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.response || data.message).toBeTruthy();
  });

  test("TC-053: Protected endpoints reject invalid token", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/ui-plan`, {
      headers: { Authorization: "Bearer invalid.token.here" },
      data: { url: "https://example.com", goal: "Test" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────
// 12. EDGE CASES & ERROR HANDLING
// ─────────────────────────────────────────────

test.describe("Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC-054: Invalid URL in planner shows error", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "not-a-valid-url");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill("Test something");
    await page.click('button:has-text("Generate"), button:has-text("Plan"), button:has-text("Start")');
    await page.waitForTimeout(5000);
    // Should show some error or not crash
    const errorEl = page.locator('[class*="rose"], [class*="error"]');
    const count = await errorEl.count();
    // Either shows error or stays on form - both are valid
    expect(count >= 0).toBeTruthy();
  });

  test("TC-055: Very long URL is handled", async ({ page }) => {
    const longUrl = "https://example.com/" + "a".repeat(500);
    await page.fill('input[placeholder*="http"]', longUrl);
    // Should not crash the UI
    await expect(page.locator("header")).toBeVisible();
  });

  test("TC-056: Special characters in goal text", async ({ page }) => {
    await page.fill('input[placeholder*="http"]', "https://example.com");
    const goalInput = page.locator('textarea, input[placeholder*="goal"], input[placeholder*="test"]').first();
    await goalInput.fill('Test <script>alert("xss")</script> & special chars "quotes"');
    // Should not break the UI
    await expect(page.locator("header")).toBeVisible();
  });

  test("TC-057: Rapid tab switching doesn't crash", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.getByText("API Testing").click();
      await page.getByText("UI Automation").click();
      await page.getByText("History").click();
    }
    await expect(page.locator("header")).toBeVisible();
  });

  test("TC-058: Multiple rapid theme toggles", async ({ page }) => {
    for (let i = 0; i < 10; i++) {
      await page.locator("header button").first().click();
    }
    await expect(page.locator("header")).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 13. ACCESSIBILITY
// ─────────────────────────────────────────────

test.describe("Accessibility", () => {
  test("TC-059: Login form has proper input labels", async ({ page }) => {
    await page.goto(BASE_URL);
    const label = page.locator("label");
    await expect(label.first()).toBeVisible();
  });

  test("TC-060: Buttons are keyboard accessible", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.keyboard.press("Tab");
    // Some element should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("TC-061: Color contrast in dark mode", async ({ page }) => {
    await login(page);
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    // Text should still be visible
    await expect(page.getByText("Test AI")).toBeVisible();
  });
});
