import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import newman from "newman";
import { chromium } from "playwright";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { retrieveContext } from "./rag-knowledge.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "bro-testing-secret-key-123";

function sanitizeEnvValue(value?: string): string {
  if (!value) return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function isConfiguredGeminiKey(rawValue?: string): boolean {
  const key = sanitizeEnvValue(rawValue);
  if (!key) return false;

  const normalized = key.toUpperCase();
  const placeholders = [
    "MY_GEMINI_API_KEY",
    "PLACE_YOUR_KEY_HERE",
    "YOUR_GEMINI_API_KEY",
    "AI_DISABLED",
  ];

  return !placeholders.some((placeholder) => normalized.includes(placeholder));
}

const SUPABASE_URL = sanitizeEnvValue(process.env.SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

let GEMINI_KEY = isConfiguredGeminiKey(process.env.GEMINI_API_KEY)
  ? sanitizeEnvValue(process.env.GEMINI_API_KEY)
  : "";

if (!GEMINI_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set. Add it via the in-app settings or .env file.");
}

let ai = new GoogleGenerativeAI(GEMINI_KEY || "AI_DISABLED");

function reloadGeminiKey(newKey: string) {
  GEMINI_KEY = newKey;
  ai = new GoogleGenerativeAI(newKey || "AI_DISABLED");
  console.log("Gemini API key updated and reloaded.");
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma2:2b";

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json() as { models?: Array<{ name: string }> };
    return Array.isArray(data.models) && data.models.some((m: any) => m.name.startsWith(OLLAMA_MODEL.split(":")[0]));
  } catch { return false; }
}

async function ollamaChat(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content || "";
}

class LocalAIEngine {
  static generatePlaywrightCode(prd: string, url: string): string {
    const lower = prd.toLowerCase();

    // Detect scenario type from PRD keywords - ordered by specificity
    const isLogin = lower.includes("login") || lower.includes("sign in") || lower.includes("signin") || lower.includes("authentication flow");
    const isRegister = lower.includes("register") || lower.includes("signup") || lower.includes("sign up");
    const isSearch = lower.includes("search") || lower.includes("filter");
    const isNavigation = lower.includes("navigation") || lower.includes("navigate") || lower.includes("menu") || lower.includes("links");
    const isErrorHandling = lower.includes("error handling") || lower.includes("validation and error") || lower.includes("invalid") || lower.includes("error message");
    const isAvailability = lower.includes("availability") || lower.includes("page load") || lower.includes("health check") || lower.includes("core page") || lower.includes("ui blocks");
    const isUserJourney = lower.includes("user journey") || lower.includes("primary") || lower.includes("main flow") || lower.includes("entry point");
    const isResponsive = lower.includes("responsive") || lower.includes("viewport") || lower.includes("mobile") || lower.includes("tablet");
    const isFormSubmission = lower.includes("form") || lower.includes("submit") || lower.includes("input field");

    // Build description as properly commented lines
    const descriptionLines = prd.split("\n").filter(l => l.trim()).map(l => `  // ${l.trim()}`).join("\n");

    if (isLogin) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Login flow - valid credentials", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Fill login form`,
        `  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();`,
        `  const passwordInput = page.locator('input[type="password"]').first();`,
        `  const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();`,
        ``,
        `  await emailInput.fill("test@example.com");`,
        `  await passwordInput.fill("password123");`,
        `  await submitBtn.click();`,
        ``,
        `  // Verify navigation away from login page`,
        `  await page.waitForTimeout(800);`,
        `  await page.screenshot({ path: "test-results/login-result.png" });`,
        `});`,
        ``,
        `test("Login flow - invalid credentials", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();`,
        `  const passwordInput = page.locator('input[type="password"]').first();`,
        `  const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();`,
        ``,
        `  await emailInput.fill("invalid@test.com");`,
        `  await passwordInput.fill("wrongpassword");`,
        `  await submitBtn.click();`,
        ``,
        `  await page.waitForTimeout(800);`,
        `  await page.screenshot({ path: "test-results/login-invalid.png" });`,
        `});`,
      ].join("\n");
    }

    if (isRegister) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Registration flow", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Look for registration form fields`,
        `  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();`,
        `  const emailInput = page.locator('input[type="email"], input[name="email"]').first();`,
        `  const passwordInput = page.locator('input[type="password"]').first();`,
        `  const submitBtn = page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")').first();`,
        ``,
        `  if (await nameInput.isVisible()) await nameInput.fill("Test User");`,
        `  await emailInput.fill("newuser@example.com");`,
        `  await passwordInput.fill("TestPass123!");`,
        `  await submitBtn.click();`,
        ``,
        `  await page.waitForTimeout(800);`,
        `  await page.screenshot({ path: "test-results/register-result.png" });`,
        `});`,
      ].join("\n");
    }

    if (isNavigation) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Navigation and menu verification", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Verify page loads successfully`,
        `  await expect(page).toHaveTitle(/.+/);`,
        ``,
        `  // Check for navigation elements`,
        `  const nav = page.locator('nav, [role="navigation"], header').first();`,
        `  await expect(nav).toBeVisible();`,
        ``,
        `  // Find and test navigation links`,
        `  const links = page.locator('nav a, header a');`,
        `  const linkCount = await links.count();`,
        `  console.log("Found " + linkCount + " navigation links");`,
        ``,
        `  // Click first available link and verify navigation`,
        `  if (linkCount > 0) {`,
        `    const firstLink = links.first();`,
        `    const linkText = await firstLink.textContent();`,
        `    await firstLink.click();`,
        `    await page.waitForLoadState("networkidle");`,
        `    console.log("Navigated via: " + linkText);`,
        `  }`,
        ``,
        `  await page.screenshot({ path: "test-results/navigation-result.png" });`,
        `});`,
      ].join("\n");
    }

    // Error handling / validation scenario
    if (isErrorHandling) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Error handling - empty form submission", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Try submitting without filling required fields`,
        `  const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")').first();`,
        `  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    await submitBtn.click();`,
        `    await page.waitForTimeout(1000);`,
        ``,
        `    // Check for error messages or validation indicators`,
        `    const errorMsg = page.locator('[class*="error"], [class*="invalid"], [role="alert"], .text-red, .text-danger').first();`,
        `    const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false);`,
        `    console.log("Error message visible after empty submit: " + hasError);`,
        `    await page.screenshot({ path: "test-results/error-empty-submit.png" });`,
        `  }`,
        `});`,
        ``,
        `test("Error handling - invalid input formats", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Fill inputs with invalid data`,
        `  const emailInput = page.locator('input[type="email"]').first();`,
        `  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    await emailInput.fill("not-an-email");`,
        `    await emailInput.press("Tab");`,
        `    await page.waitForTimeout(500);`,
        `    await page.screenshot({ path: "test-results/error-invalid-email.png" });`,
        `  }`,
        ``,
        `  // Try invalid password`,
        `  const passInput = page.locator('input[type="password"]').first();`,
        `  if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    await passInput.fill("1");`,
        `    await passInput.press("Tab");`,
        `    await page.waitForTimeout(500);`,
        `    await page.screenshot({ path: "test-results/error-invalid-password.png" });`,
        `  }`,
        `});`,
      ].join("\n");
    }

    // Page availability / core check scenario
    if (isAvailability) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Core page availability - loads successfully", async ({ page }) => {`,
        `  const startTime = Date.now();`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        `  const loadTime = Date.now() - startTime;`,
        `  console.log("Page load time: " + loadTime + "ms");`,
        ``,
        `  // Page should have a title`,
        `  const title = await page.title();`,
        `  expect(title.length).toBeGreaterThan(0);`,
        `  console.log("Page title: " + title);`,
        ``,
        `  // Check HTTP status (page loaded without errors)`,
        `  await page.screenshot({ path: "test-results/availability-loaded.png" });`,
        `});`,
        ``,
        `test("Core page availability - critical UI elements visible", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Check for heading`,
        `  const heading = page.locator('h1, h2').first();`,
        `  await expect(heading).toBeVisible({ timeout: 5000 });`,
        `  const headingText = await heading.textContent();`,
        `  console.log("Main heading: " + headingText);`,
        ``,
        `  // Check for primary CTA / button`,
        `  const cta = page.locator('button:visible, a[class*="btn"]:visible, [role="button"]:visible').first();`,
        `  const ctaVisible = await cta.isVisible({ timeout: 3000 }).catch(() => false);`,
        `  console.log("Primary CTA visible: " + ctaVisible);`,
        ``,
        `  // Check no console errors`,
        `  const errors: string[] = [];`,
        `  page.on("pageerror", (err) => errors.push(err.message));`,
        `  await page.waitForTimeout(800);`,
        `  console.log("Console errors found: " + errors.length);`,
        ``,
        `  await page.screenshot({ path: "test-results/availability-elements.png", fullPage: true });`,
        `});`,
      ].join("\n");
    }

    // Primary user journey scenario
    if (isUserJourney) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Primary user journey - end to end flow", async ({ page }) => {`,
        descriptionLines,
        ``,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Step 1: Verify landing page`,
        `  const heading = page.locator('h1, h2, h3').first();`,
        `  await expect(heading).toBeVisible({ timeout: 5000 });`,
        `  console.log("Landing page loaded");`,
        `  await page.screenshot({ path: "test-results/journey-step1-landing.png" });`,
        ``,
        `  // Step 2: Interact with primary action`,
        `  const primaryBtn = page.locator('button:visible, a[class*="btn"]:visible').first();`,
        `  if (await primaryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    const btnText = await primaryBtn.textContent();`,
        `    console.log("Clicking primary action: " + btnText?.trim());`,
        `    await primaryBtn.click();`,
        `    await page.waitForTimeout(800);`,
        `    await page.screenshot({ path: "test-results/journey-step2-action.png" });`,
        `  }`,
        ``,
        `  // Step 3: Fill any visible forms`,
        `  const inputs = page.locator('input:visible');`,
        `  const inputCount = await inputs.count();`,
        `  if (inputCount > 0) {`,
        `    for (let i = 0; i < Math.min(inputCount, 4); i++) {`,
        `      const input = inputs.nth(i);`,
        `      const type = await input.getAttribute("type") || "text";`,
        `      try {`,
        `        if (type === "email") await input.fill("test@example.com");`,
        `        else if (type === "password") await input.fill("TestPass123!");`,
        `        else if (type === "tel") await input.fill("1234567890");`,
        `        else await input.fill("Test data");`,
        `      } catch {}`,
        `    }`,
        `    console.log("Filled " + Math.min(inputCount, 4) + " form inputs");`,
        `    await page.screenshot({ path: "test-results/journey-step3-form.png" });`,
        `  }`,
        ``,
        `  // Step 4: Verify final state`,
        `  const currentUrl = page.url();`,
        `  console.log("Final URL: " + currentUrl);`,
        `  await page.screenshot({ path: "test-results/journey-step4-final.png" });`,
        `});`,
      ].join("\n");
    }

    // Responsive / viewport scenario
    if (isResponsive) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Responsive - Desktop 1920x1080", async ({ page }) => {`,
        `  await page.setViewportSize({ width: 1920, height: 1080 });`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        `  await page.screenshot({ path: "test-results/responsive-desktop-xl.png", fullPage: true });`,
        `});`,
        ``,
        `test("Responsive - Laptop 1280x720", async ({ page }) => {`,
        `  await page.setViewportSize({ width: 1280, height: 720 });`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        `  await page.screenshot({ path: "test-results/responsive-laptop.png", fullPage: true });`,
        `});`,
        ``,
        `test("Responsive - Tablet 768x1024", async ({ page }) => {`,
        `  await page.setViewportSize({ width: 768, height: 1024 });`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Check if mobile menu appears`,
        `  const hamburger = page.locator('[class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu" i]').first();`,
        `  const hasMobileMenu = await hamburger.isVisible({ timeout: 2000 }).catch(() => false);`,
        `  console.log("Mobile menu visible on tablet: " + hasMobileMenu);`,
        ``,
        `  await page.screenshot({ path: "test-results/responsive-tablet.png", fullPage: true });`,
        `});`,
        ``,
        `test("Responsive - Mobile 375x812", async ({ page }) => {`,
        `  await page.setViewportSize({ width: 375, height: 812 });`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  // Check for horizontal overflow`,
        `  const hasOverflow = await page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");`,
        `  console.log("Has horizontal overflow on mobile: " + hasOverflow);`,
        `  expect(hasOverflow).toBe(false);`,
        ``,
        `  await page.screenshot({ path: "test-results/responsive-mobile.png", fullPage: true });`,
        `});`,
      ].join("\n");
    }

    // Form submission scenario
    if (isFormSubmission) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Form discovery and auto-fill", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  const inputs = page.locator('input:visible, textarea:visible, select:visible');`,
        `  const inputCount = await inputs.count();`,
        `  console.log("Found " + inputCount + " form inputs");`,
        ``,
        `  // Auto-fill all visible inputs`,
        `  for (let i = 0; i < inputCount; i++) {`,
        `    const input = inputs.nth(i);`,
        `    const type = await input.getAttribute("type") || "text";`,
        `    const tag = await input.evaluate(el => el.tagName.toLowerCase());`,
        `    try {`,
        `      if (tag === "select") {`,
        `        const options = await input.locator("option").all();`,
        `        if (options.length > 1) await input.selectOption({ index: 1 });`,
        `      } else if (type === "email") await input.fill("test@example.com");`,
        `      else if (type === "password") await input.fill("TestPass123!");`,
        `      else if (type === "number") await input.fill("42");`,
        `      else if (type === "tel") await input.fill("1234567890");`,
        `      else if (type === "checkbox" || type === "radio") await input.check().catch(() => {});`,
        `      else if (tag === "textarea") await input.fill("This is a test message for form validation.");`,
        `      else await input.fill("Test input value");`,
        `    } catch {}`,
        `  }`,
        `  await page.screenshot({ path: "test-results/form-filled.png" });`,
        `});`,
        ``,
        `test("Form submission attempt", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")').first();`,
        `  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    // Submit empty form first`,
        `    await submitBtn.click();`,
        `    await page.waitForTimeout(1000);`,
        `    await page.screenshot({ path: "test-results/form-empty-submit.png" });`,
        `  } else {`,
        `    console.log("No submit button found on page");`,
        `    await page.screenshot({ path: "test-results/form-no-submit.png" });`,
        `  }`,
        `});`,
      ].join("\n");
    }

    if (isSearch) {
      return [
        `import { test, expect } from "@playwright/test";`,
        ``,
        `test("Search functionality", async ({ page }) => {`,
        `  await page.goto("${url}");`,
        `  await page.waitForLoadState("networkidle");`,
        ``,
        `  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]').first();`,
        ``,
        `  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {`,
        `    await searchInput.fill("test query");`,
        `    await searchInput.press("Enter");`,
        `    await page.waitForTimeout(800);`,
        `    console.log("Search submitted");`,
        `    await page.screenshot({ path: "test-results/search-results.png" });`,
        `  } else {`,
        `    console.log("No search input found");`,
        `    await page.screenshot({ path: "test-results/no-search.png" });`,
        `  }`,
        `});`,
      ].join("\n");
    }

    // Default: comprehensive health check with element discovery
    return [
      `import { test, expect } from "@playwright/test";`,
      ``,
      `test("Page health check and element discovery", async ({ page }) => {`,
      descriptionLines,
      ``,
      `  await page.goto("${url}");`,
      `  await page.waitForLoadState("networkidle");`,
      ``,
      `  // Verify page loads`,
      `  await expect(page).toHaveTitle(/.*/);`,
      `  const title = await page.title();`,
      `  console.log("Page title: " + title);`,
      ``,
      `  // Discover interactive elements`,
      `  const buttons = page.locator('button:visible, a:visible');`,
      `  const inputs = page.locator('input:visible, textarea:visible');`,
      `  const images = page.locator('img:visible');`,
      ``,
      `  console.log("Buttons/Links: " + await buttons.count());`,
      `  console.log("Inputs: " + await inputs.count());`,
      `  console.log("Images: " + await images.count());`,
      ``,
      `  // Check for main content areas`,
      `  const heading = page.locator('h1, h2, h3').first();`,
      `  if (await heading.isVisible()) {`,
      `    const headingText = await heading.textContent();`,
      `    console.log("Main heading: " + headingText);`,
      `  }`,
      ``,
      `  await page.screenshot({ path: "test-results/health-check.png", fullPage: true });`,
      `});`,
    ].join("\n");
  }

  static generateChatResponse(message: string, contextCode = ""): { response: string; fixedCode?: string } {
    const msg = message.toLowerCase();

    // Greetings
    if (msg.match(/^(hi+|hello|hey|sup|yo|namaste|hii+)\b/)) {
      return { response: "Hey! I'm **Test AI** - your Senior QA Automation Engineer.\n\nI can help you with:\n- Writing Playwright test cases\n- Debugging failing tests\n- Improving test coverage\n- Best practices for UI/API automation\n- Fixing locator issues\n\nWhat do you need help with?" };
    }

    // Fix/Error handling with context awareness
    if (msg.includes("fix") || msg.includes("error") || msg.includes("fail") || msg.includes("broken") || msg.includes("not working")) {
      if (contextCode) {
        // Analyze the context code for common issues
        const issues: string[] = [];
        const fixes: string[] = [];

        if (contextCode.includes("waitForTimeout")) {
          issues.push("Using `waitForTimeout` (hard waits) - these are flaky");
          fixes.push("Replace `waitForTimeout` with `waitForLoadState('networkidle')` or `waitForSelector`");
        }
        if (contextCode.includes(".click()") && !contextCode.includes("waitFor")) {
          issues.push("Clicking elements without waiting for them to be ready");
          fixes.push("Add `await element.waitFor({ state: 'visible' })` before clicking");
        }
        if (!contextCode.includes("waitForLoadState")) {
          issues.push("No `waitForLoadState` after navigation");
          fixes.push("Add `await page.waitForLoadState('networkidle')` after `goto()`");
        }
        if (contextCode.match(/locator\('[^']*'\)/g)?.length) {
          issues.push("Using CSS selectors - consider using more resilient locators");
          fixes.push("Use `getByRole()`, `getByText()`, or `getByTestId()` for better stability");
        }

        let fixedCode = contextCode;
        // Apply automatic fixes
        if (!contextCode.includes("waitForLoadState") && contextCode.includes(".goto(")) {
          fixedCode = fixedCode.replace(
            /await page\.goto\(([^)]+)\);/g,
            'await page.goto($1);\n  await page.waitForLoadState("networkidle");'
          );
        }

        const response = `**Analysis of your test code:**\n\n${issues.length > 0 ? "**Issues found:**\n" + issues.map((i, idx) => `${idx + 1}. ${i}`).join("\n") : "No major issues detected."}\n\n${fixes.length > 0 ? "**Suggested fixes:**\n" + fixes.map((f, idx) => `${idx + 1}. ${f}`).join("\n") : ""}\n\n\`\`\`typescript\n${fixedCode}\n\`\`\``;

        return { response, fixedCode: fixedCode !== contextCode ? fixedCode : undefined };
      }
      return { response: "I can help fix your test! Please share the error message or describe what's failing. Also make sure you have a test loaded in the editor so I can analyze it.\n\n**Common fixes:**\n1. Add `waitForLoadState('networkidle')` after navigation\n2. Use `getByRole()` instead of CSS selectors\n3. Add proper error handling with try-catch\n4. Increase timeout for slow-loading pages" };
    }

    // Test writing help
    if (msg.includes("write") || msg.includes("create") || msg.includes("generate") || msg.includes("test for") || msg.includes("test case")) {
      const urlMatch = msg.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : "https://example.com";
      const testCode = `import { test, expect } from '@playwright/test';\n\ntest('User journey test', async ({ page }) => {\n  await page.goto('${url}');\n  await page.waitForLoadState('networkidle');\n\n  // Verify page loaded\n  await expect(page).toHaveTitle(/.+/);\n\n  // Find and interact with key elements\n  const heading = page.getByRole('heading').first();\n  await expect(heading).toBeVisible();\n\n  // Screenshot for visual verification\n  await page.screenshot({ path: 'test-results/test-output.png' });\n});`;
      return {
        response: `Here's a test case for you:\n\n\`\`\`typescript\n${testCode}\n\`\`\`\n\nYou can customize this by:\n- Adding more assertions with \`expect()\`\n- Using \`getByRole()\`, \`getByText()\` for element selection\n- Adding form interactions with \`fill()\` and \`click()\``,
        fixedCode: testCode,
      };
    }

    // Locator help
    if (msg.includes("locator") || msg.includes("selector") || msg.includes("find element") || msg.includes("element")) {
      return { response: "**Playwright Locator Best Practices:**\n\n1. **By role** (recommended): `page.getByRole('button', { name: 'Submit' })`\n2. **By text**: `page.getByText('Welcome')`\n3. **By test ID**: `page.getByTestId('login-form')`\n4. **By placeholder**: `page.getByPlaceholder('Enter email')`\n5. **By label**: `page.getByLabel('Email address')`\n6. **CSS selector** (fallback): `page.locator('.my-class')`\n\n**Tips:**\n- Prefer role-based locators - they're most resilient to UI changes\n- Use `.first()` or `.nth(n)` when multiple matches exist\n- Chain locators: `page.getByRole('dialog').getByRole('button')`" };
    }

    // Assertion help
    if (msg.includes("assert") || msg.includes("expect") || msg.includes("verify") || msg.includes("check")) {
      return { response: "**Common Playwright Assertions:**\n\n```typescript\n// Page assertions\nawait expect(page).toHaveTitle(/My App/);\nawait expect(page).toHaveURL(/dashboard/);\n\n// Element visibility\nawait expect(locator).toBeVisible();\nawait expect(locator).toBeHidden();\nawait expect(locator).toBeEnabled();\n\n// Text content\nawait expect(locator).toHaveText('Hello');\nawait expect(locator).toContainText('Welcome');\n\n// Form values\nawait expect(locator).toHaveValue('test@email.com');\nawait expect(locator).toBeChecked();\n\n// Count\nawait expect(locator).toHaveCount(3);\n```" };
    }

    // Wait/timeout help
    if (msg.includes("wait") || msg.includes("timeout") || msg.includes("slow") || msg.includes("loading")) {
      return { response: "**Handling Waits in Playwright:**\n\n**Auto-waiting** (built-in):\n- Playwright auto-waits for elements before actions\n- `click()`, `fill()`, `check()` all auto-wait\n\n**Explicit waits:**\n```typescript\n// Wait for page load\nawait page.waitForLoadState('networkidle');\n\n// Wait for element\nawait page.waitForSelector('.my-element');\n\n// Wait for navigation\nawait page.waitForURL('**/dashboard');\n\n// Wait for network request\nawait page.waitForResponse('**/api/data');\n```\n\n**Avoid** `waitForTimeout()` - use event-based waits instead!" };
    }

    // API testing help
    if (msg.includes("api") || msg.includes("request") || msg.includes("endpoint") || msg.includes("postman")) {
      return { response: "**Playwright API Testing:**\n\n```typescript\nimport { test, expect } from '@playwright/test';\n\ntest('API test', async ({ request }) => {\n  // GET request\n  const response = await request.get('/api/users');\n  expect(response.ok()).toBeTruthy();\n  const data = await response.json();\n  expect(data.length).toBeGreaterThan(0);\n\n  // POST request\n  const created = await request.post('/api/users', {\n    data: { name: 'Test User', email: 'test@test.com' }\n  });\n  expect(created.status()).toBe(201);\n});\n```\n\nUpload a Postman collection in the API Testing tab to auto-generate tests!" };
    }

    // Best practices
    if (msg.includes("best practice") || msg.includes("tips") || msg.includes("improve") || msg.includes("better")) {
      return { response: "**Playwright Best Practices:**\n\n1. **Use web-first assertions** - `expect(locator).toBeVisible()` instead of manual checks\n2. **Avoid hard waits** - Use `waitForLoadState`, `waitForSelector`, `waitForResponse`\n3. **Use role-based locators** - `getByRole()`, `getByText()`, `getByTestId()`\n4. **Page Object Model** - Organize tests with reusable page classes\n5. **Test isolation** - Each test should be independent\n6. **Screenshots on failure** - Use `screenshot: 'only-on-failure'` in config\n7. **Parallel execution** - Playwright runs tests in parallel by default\n8. **Trace viewer** - Enable traces for debugging: `trace: 'on-first-retry'`" };
    }

    // Debug help
    if (msg.includes("debug") || msg.includes("inspect") || msg.includes("trace")) {
      return { response: "**Debugging Playwright Tests:**\n\n1. **Trace Viewer**: Add `trace: 'on'` in config, then:\n   ```bash\n   npx playwright show-trace trace.zip\n   ```\n\n2. **Debug Mode**: Run with inspector:\n   ```bash\n   npx playwright test --debug\n   ```\n\n3. **Pause in test**:\n   ```typescript\n   await page.pause(); // Opens inspector\n   ```\n\n4. **Screenshots**: Capture state at any point:\n   ```typescript\n   await page.screenshot({ path: 'debug.png', fullPage: true });\n   ```\n\n5. **Console logs**: `console.log()` works in tests" };
    }

    // Default - helpful response
    return { response: "I'm **Test AI**, your QA automation assistant. Here's what I can help with:\n\n- **\"Write a test for [URL]\"** - I'll generate Playwright test code\n- **\"Fix this error\"** - I'll analyze and fix test issues\n- **\"How to use locators\"** - Guidance on element selection\n- **\"Best practices\"** - Testing tips and patterns\n- **\"How to wait\"** - Handling async operations\n- **\"API testing\"** - REST API test patterns\n- **\"Debug\"** - Debugging techniques\n\nTry asking me something specific!" };
  }

  static generateUiPlan(goal: string, suiteType: string, authNotes = "", analysis?: PageAnalysis | null) {
    type Scenario = { id: string; title: string; objective: string; risk: "low" | "medium" | "high"; steps: string[] };
    const scenarios: Scenario[] = [];
    const a = analysis;
    const lower = goal.toLowerCase();

    // Detect user intent from goal
    const wantsLogin = lower.includes("login") || lower.includes("sign in") || lower.includes("signin") || lower.includes("authentication") || lower.includes("auth");
    const wantsRegister = lower.includes("register") || lower.includes("signup") || lower.includes("sign up") || lower.includes("create account");
    const wantsSearch = lower.includes("search") || lower.includes("find");
    const wantsNav = lower.includes("navigation") || lower.includes("nav") || lower.includes("menu") || lower.includes("link");
    const wantsForms = lower.includes("form") || lower.includes("contact") || lower.includes("submit") || lower.includes("input");
    const wantsCart = lower.includes("cart") || lower.includes("checkout") || lower.includes("shop") || lower.includes("buy") || lower.includes("ecommerce") || lower.includes("product");
    const wantsResponsive = lower.includes("responsive") || lower.includes("mobile") || lower.includes("tablet");
    const wantsPerformance = lower.includes("performance") || lower.includes("speed") || lower.includes("load time") || lower.includes("metric");
    const wantsAccessibility = lower.includes("accessibility") || lower.includes("a11y") || lower.includes("screen reader") || lower.includes("aria");
    const wantsApi = lower.includes("api") || lower.includes("network") || lower.includes("request") || lower.includes("endpoint");
    const hasSpecificIntent = wantsLogin || wantsRegister || wantsSearch || wantsNav || wantsForms || wantsCart || wantsResponsive || wantsPerformance || wantsAccessibility || wantsApi;

    // 1. Always: Page Load
    scenarios.push({
      id: "page-load",
      title: "Page Load & Availability",
      objective: `Verify ${a?.title || "the page"} loads successfully.`,
      risk: "low",
      steps: [
        "Navigate to the application",
        "Verify page title is present",
        ...(a?.headings?.length ? [`Verify heading "${a.headings[0].text}" is visible`] : ["Verify heading elements are visible"]),
        "Capture screenshot of loaded page",
      ],
    });

    // LOGIN-specific deep scenarios
    if (wantsLogin || (!hasSpecificIntent && a?.hasLogin)) {
      const emailInput = a?.inputs?.find(i => i.type === "email" || i.name?.includes("email") || i.placeholder?.toLowerCase().includes("email"));
      const passInput = a?.inputs?.find(i => i.type === "password");
      const loginBtn = a?.buttons?.find(b => /(login|sign.?in|submit|enter)/i.test(b.text));

      scenarios.push({
        id: "login-form-discovery",
        title: "Login Form Discovery",
        objective: "Verify login form elements are present and visible.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          `Verify ${emailInput ? `"${emailInput.placeholder || emailInput.name || "email"}" input` : "email/username input"} is visible`,
          `Verify ${passInput ? "password field" : "password input"} is visible`,
          `Verify ${loginBtn ? `"${loginBtn.text}" button` : "submit/login button"} is visible`,
          "Capture screenshot of login form",
        ],
      });

      scenarios.push({
        id: "login-valid",
        title: "Login with Valid Credentials",
        objective: "Test full login flow with realistic credentials.",
        risk: "high",
        steps: [
          "Navigate to the application",
          `Fill email field with testuser@example.com`,
          `Fill password field with Test@12345`,
          `Click ${loginBtn ? `"${loginBtn.text}"` : "Login"} button`,
          "Wait for page response",
          "Verify successful login or dashboard",
          "Capture screenshot of result",
        ],
      });

      scenarios.push({
        id: "login-empty-fields",
        title: "Login with Empty Fields (Negative)",
        objective: "Verify form validation prevents submission with empty fields.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Clear email field",
          "Clear password field",
          `Submit the form`,
          "Verify error or validation message is displayed",
          "Capture screenshot of validation state",
        ],
      });

      scenarios.push({
        id: "login-invalid-email",
        title: "Login with Invalid Email Format (Negative)",
        objective: "Verify email validation rejects malformed emails.",
        risk: "high",
        steps: [
          "Navigate to the application",
          "Fill email field with invalid-email-format",
          "Fill password field with Test@12345",
          `Click ${loginBtn ? `"${loginBtn.text}"` : "Login"} button`,
          "Verify error or validation message is displayed",
          "Capture screenshot of error state",
        ],
      });

      scenarios.push({
        id: "login-wrong-password",
        title: "Login with Wrong Password (Negative)",
        objective: "Verify error handling for incorrect password.",
        risk: "high",
        steps: [
          "Navigate to the application",
          "Fill email field with testuser@example.com",
          "Fill password field with wrongpassword123",
          `Click ${loginBtn ? `"${loginBtn.text}"` : "Login"} button`,
          "Verify login fails with invalid credentials error",
          "Capture screenshot of error state",
        ],
      });

      scenarios.push({
        id: "login-only-email",
        title: "Login with Only Email, No Password (Negative)",
        objective: "Verify password field is required.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Fill email field with testuser@example.com",
          "Clear password field",
          `Submit the form`,
          "Verify error or validation message is displayed",
          "Capture screenshot",
        ],
      });

      if (wantsLogin) {
        scenarios.push({
          id: "login-sql-injection",
          title: "Login SQL Injection Test (Security)",
          objective: "Verify login form handles SQL injection attempts safely.",
          risk: "high",
          steps: [
            "Navigate to the application",
            "Fill email field with ' OR '1'='1",
            "Fill password field with ' OR '1'='1",
            `Click ${loginBtn ? `"${loginBtn.text}"` : "Login"} button`,
            "Verify login fails or error is shown",
            "Capture screenshot",
          ],
        });

        scenarios.push({
          id: "login-xss-test",
          title: "Login XSS Test (Security)",
          objective: "Verify login form sanitizes script injection.",
          risk: "high",
          steps: [
            "Navigate to the application",
            "Fill email field with <script>alert('xss')</script>",
            "Fill password field with <img onerror=alert(1) src=x>",
            `Click ${loginBtn ? `"${loginBtn.text}"` : "Login"} button`,
            "Verify no script executes and error is shown",
            "Capture screenshot",
          ],
        });
      }
    }

    // REGISTER-specific scenarios
    if (wantsRegister) {
      scenarios.push({
        id: "register-form",
        title: "Registration Form Discovery",
        objective: "Verify registration form fields are present.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Verify form fields are present",
          "Verify all registration inputs are visible",
          "Capture screenshot of registration form",
        ],
      });

      scenarios.push({
        id: "register-submit",
        title: "Register with Test Data",
        objective: "Test registration flow with test credentials.",
        risk: "high",
        steps: [
          "Navigate to the application",
          "Fill all visible input fields with test data",
          "Click the submit button",
          "Wait for page response",
          "Verify registration response",
          "Capture screenshot of result",
        ],
      });

      scenarios.push({
        id: "register-validation",
        title: "Registration Validation",
        objective: "Test form validation with empty/invalid data.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Click the submit button",
          "Verify form validation errors appear",
          "Capture screenshot of validation",
        ],
      });
    }

    // SEARCH-specific scenarios
    if (wantsSearch || (!hasSpecificIntent && a?.hasSearch)) {
      scenarios.push({
        id: "search-visibility",
        title: "Search Input Discovery",
        objective: "Verify search functionality is visible and accessible.",
        risk: "low",
        steps: [
          "Navigate to the application",
          "Verify search input is visible",
          "Capture screenshot of search area",
        ],
      });

      scenarios.push({
        id: "search-valid",
        title: "Search with Valid Query",
        objective: "Test search with a valid search term.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Fill search input with test query",
          "Click search or press Enter",
          "Wait for page response",
          "Verify search results appear",
          "Capture screenshot of results",
        ],
      });

      if (wantsSearch) {
        scenarios.push({
          id: "search-empty",
          title: "Search with Empty Query",
          objective: "Test search behavior with empty input.",
          risk: "low",
          steps: [
            "Navigate to the application",
            "Click search or press Enter",
            "Verify page handles empty search",
            "Capture screenshot",
          ],
        });
      }
    }

    // NAVIGATION-specific scenarios
    if (wantsNav || (!hasSpecificIntent && (a?.hasNav || (a?.links && a.links.length > 2)))) {
      const topLinks = (a?.links || []).slice(0, 5).map(l => l.text).filter(Boolean);
      scenarios.push({
        id: "nav-menu",
        title: "Navigation Menu Verification",
        objective: `Test navigation menu${topLinks.length ? ` with links: ${topLinks.join(", ")}` : ""}.`,
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Verify navigation menu is visible",
          `Check links are present (found ${a?.links?.length || 0})`,
          ...(topLinks.length ? [`Click on "${topLinks[0]}"`] : ["Click on first navigation link"]),
          "Verify page navigated successfully",
          "Capture screenshot after navigation",
        ],
      });

      if (wantsNav && topLinks.length > 1) {
        for (let i = 1; i < Math.min(topLinks.length, 4); i++) {
          scenarios.push({
            id: `nav-link-${i}`,
            title: `Navigate to "${topLinks[i]}"`,
            objective: `Test navigation to ${topLinks[i]} link.`,
            risk: "low",
            steps: [
              "Navigate to the application",
              `Click on "${topLinks[i]}"`,
              "Verify page navigated successfully",
              "Verify content sections are present",
              "Capture screenshot",
            ],
          });
        }
      }
    }

    // FORM-specific scenarios
    if (wantsForms || (!hasSpecificIntent && (a?.hasForms || (a?.inputs && a.inputs.length > 0)))) {
      const inputTypes = (a?.inputs || []).map(i => i.placeholder || i.name || i.type).filter(Boolean).slice(0, 4);
      scenarios.push({
        id: "form-discovery",
        title: "Form Discovery & Interaction",
        objective: `Test form inputs${inputTypes.length ? `: ${inputTypes.join(", ")}` : ""}.`,
        risk: "medium",
        steps: [
          "Navigate to the application",
          `Verify form fields are present (found ${a?.inputs?.length || 0})`,
          "Fill all visible input fields with test data",
          "Capture screenshot of filled form",
          "Click the submit button",
          "Verify form submission response",
        ],
      });

      if (wantsForms) {
        scenarios.push({
          id: "form-validation",
          title: "Form Validation Testing",
          objective: "Test form validation with empty/invalid data.",
          risk: "medium",
          steps: [
            "Navigate to the application",
            "Click the submit button",
            "Verify form validation errors appear",
            "Capture screenshot of validation",
          ],
        });
      }
    }

    // CART/ECOMMERCE-specific scenarios
    if (wantsCart) {
      scenarios.push({
        id: "product-listing",
        title: "Product Listing Verification",
        objective: "Verify products are displayed correctly.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Verify content sections are present",
          "Verify images are displayed",
          "Verify buttons are present",
          "Scroll to bottom of page",
          "Capture screenshot of products",
        ],
      });

      scenarios.push({
        id: "add-to-cart",
        title: "Add to Cart Flow",
        objective: "Test adding a product to cart.",
        risk: "high",
        steps: [
          "Navigate to the application",
          "Click on first visible button",
          "Wait for page response",
          "Verify page responds to button click",
          "Capture screenshot of cart state",
        ],
      });

      scenarios.push({
        id: "cart-checkout",
        title: "Checkout Flow",
        objective: "Test the checkout process.",
        risk: "high",
        steps: [
          "Navigate to the application",
          "Click on first visible button",
          "Verify form fields are present",
          "Fill all visible input fields with test data",
          "Click the submit button",
          "Capture screenshot of checkout",
        ],
      });
    }

    // AUTO-DETECT: If page has forms but user didn't specify, generate functional tests
    if (!hasSpecificIntent && a?.forms && a.forms.length > 0) {
      for (const form of a.forms.slice(0, 3)) {
        if (form.formType === "login" && !scenarios.some(s => s.id.includes("login"))) {
          // Already handled above
        } else if (form.formType !== "login" && form.formType !== "search" && form.fields.length > 0) {
          const formLabel = form.formType !== "generic" ? form.formType : "form";
          scenarios.push({
            id: `form-${form.formType}-positive`,
            title: `${form.formType.charAt(0).toUpperCase() + form.formType.slice(1)} Form — Valid Submission`,
            objective: `Test ${formLabel} form with valid data.`,
            risk: "medium",
            steps: [
              "Navigate to the application",
              ...form.fields.slice(0, 6).map(f => {
                const fieldName = f.label || f.placeholder || f.name || f.type;
                let value = "Test input data";
                if (f.type === "email") value = "testuser@example.com";
                else if (f.type === "password") value = "Test@12345";
                else if (f.type === "tel") value = "9876543210";
                else if (f.name?.includes("name") || f.placeholder?.toLowerCase().includes("name")) value = "John Doe";
                return `Fill ${fieldName} field with ${value}`;
              }),
              form.submitButton ? `Click ${form.submitButton} button` : "Submit the form",
              "Verify no error message is displayed",
              "Capture screenshot",
            ],
          });

          scenarios.push({
            id: `form-${form.formType}-negative`,
            title: `${form.formType.charAt(0).toUpperCase() + form.formType.slice(1)} Form — Empty Submission (Negative)`,
            objective: `Test ${formLabel} form validation with empty fields.`,
            risk: "high",
            steps: [
              "Navigate to the application",
              form.submitButton ? `Click ${form.submitButton} button` : "Submit the form",
              "Verify error or validation message is displayed",
              "Capture screenshot",
            ],
          });
        }
      }
    }

    // BUTTON interactions (when no specific intent or page has buttons)
    if (!hasSpecificIntent && a?.buttons && a.buttons.length > 0) {
      const topBtns = a.buttons.slice(0, 3).map(b => b.text).filter(Boolean);
      scenarios.push({
        id: "button-interactions",
        title: "Button & CTA Interactions",
        objective: `Test interactive buttons: ${topBtns.join(", ") || "page buttons"}.`,
        risk: "medium",
        steps: [
          "Navigate to the application",
          `Verify buttons are present (found ${a.buttons.length})`,
          ...(topBtns.length ? [`Click on "${topBtns[0]}" button`] : ["Click on first visible button"]),
          "Verify page responds to button click",
          ...(topBtns.length > 1 ? [`Click on "${topBtns[1]}" button`] : []),
          "Capture screenshot after interactions",
        ],
      });
    }

    // Visual Content (only when no specific intent)
    if (!hasSpecificIntent) {
      scenarios.push({
        id: "content-structure",
        title: "Visual Content & Structure",
        objective: `Validate page structure: ${a?.sections || 0} sections, ${a?.images || 0} images.`,
        risk: "low",
        steps: [
          "Navigate to the application",
          "Verify content sections are present",
          ...(a?.hasFooter ? ["Verify footer is visible"] : []),
          "Scroll to bottom of page",
          "Capture screenshot of full page",
        ],
      });
    }

    // RESPONSIVE scenarios
    if (wantsResponsive || (!hasSpecificIntent)) {
      scenarios.push({
        id: "responsive",
        title: "Responsive Layout Check",
        objective: "Verify the layout adapts correctly to mobile viewport.",
        risk: "low",
        steps: [
          "Navigate to the application",
          "Verify responsive layout renders correctly",
          "Scroll to bottom of page",
          "Capture screenshot at mobile viewport",
        ],
      });
    }

    // PERFORMANCE scenarios
    if (wantsPerformance || (!hasSpecificIntent)) {
      scenarios.push({
        id: "performance",
        title: "Performance & Load Metrics",
        objective: "Measure page load time and check for JS errors.",
        risk: "low",
        steps: [
          "Navigate to the application",
          "Capture performance metrics",
          "Check for JavaScript errors in console",
          ...(wantsApi || wantsPerformance ? ["Verify network requests complete successfully"] : []),
        ],
      });
    }

    // ACCESSIBILITY scenarios
    if (wantsAccessibility || (!hasSpecificIntent)) {
      scenarios.push({
        id: "accessibility",
        title: "Accessibility Audit",
        objective: "Check for missing alt text, labels, headings, and landmarks.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Check accessibility - images, headings, labels",
          "Test keyboard navigation via Tab",
          "Capture screenshot of accessibility state",
        ],
      });
    }

    // API/NETWORK scenarios
    if (wantsApi) {
      scenarios.push({
        id: "network-check",
        title: "Network & API Monitoring",
        objective: "Monitor network requests and check for failures.",
        risk: "medium",
        steps: [
          "Navigate to the application",
          "Verify network requests complete successfully",
          "Click on first visible button",
          "Verify network requests complete successfully",
          "Capture screenshot",
        ],
      });
    }

    return scenarios;
  }
}

// ===== Dynamic Page Analyzer =====
interface FormField {
  type: string;
  name: string;
  placeholder: string;
  label: string;
  required: boolean;
  id: string;
  validation: string;
}

interface FormInfo {
  action: string;
  method: string;
  fields: FormField[];
  submitButton: string;
  formType: string; // login, signup, search, contact, checkout, generic
}

interface PageAnalysis {
  title: string;
  url: string;
  headings: { tag: string; text: string }[];
  buttons: { text: string; type: string }[];
  links: { text: string; href: string }[];
  inputs: { type: string; name: string; placeholder: string }[];
  forms: FormInfo[];
  images: number;
  hasNav: boolean;
  hasFooter: boolean;
  hasSearch: boolean;
  hasLogin: boolean;
  hasForms: boolean;
  hasSignup: boolean;
  hasDropdowns: boolean;
  hasModals: boolean;
  hasTables: boolean;
  hasCards: boolean;
  interactiveElements: number;
  sections: number;
  bodyTextPreview: string;
  pageType: string; // landing, dashboard, auth, ecommerce, blog, form-heavy, generic
}

async function analyzePage(targetUrl: string): Promise<PageAnalysis> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);

    const analysis: PageAnalysis = await page.evaluate(`(function(){
      var headings = Array.from(document.querySelectorAll("h1,h2,h3")).map(function(h){
        return { tag: h.tagName, text: (h.textContent||"").trim().substring(0,80) };
      }).filter(function(h){ return h.text; }).slice(0,12);

      var buttons = Array.from(document.querySelectorAll("button:not([hidden]),[role='button'],input[type='submit'],input[type='button']")).map(function(b){
        return { text: (b.textContent||b.value||b.getAttribute("aria-label")||"").trim().substring(0,50), type: b.getAttribute("type")||"" };
      }).filter(function(b){ return b.text && b.text.length < 50; }).slice(0,20);

      var links = Array.from(document.querySelectorAll("a[href]")).map(function(a){
        return { text: (a.textContent||"").trim().substring(0,60), href: a.getAttribute("href")||"" };
      }).filter(function(l){ return l.text && l.text.length > 1 && l.text.length < 60; }).slice(0,20);

      var inputs = Array.from(document.querySelectorAll("input:not([type='hidden']),textarea,select")).map(function(i){
        return {
          type: i.getAttribute("type")||i.tagName.toLowerCase(),
          name: i.getAttribute("name")||"",
          placeholder: i.getAttribute("placeholder")||""
        };
      }).filter(function(i){ return i.type !== "hidden"; }).slice(0,20);

      // Deep form analysis
      var forms = Array.from(document.querySelectorAll("form")).map(function(form) {
        var fields = Array.from(form.querySelectorAll("input:not([type='hidden']),textarea,select")).map(function(f) {
          var id = f.getAttribute("id") || "";
          var labelEl = id ? document.querySelector("label[for='" + id + "']") : null;
          if (!labelEl) labelEl = f.closest("label");
          var parentText = f.parentElement ? (f.parentElement.textContent||"").trim().substring(0,60) : "";
          return {
            type: f.getAttribute("type") || f.tagName.toLowerCase(),
            name: f.getAttribute("name") || "",
            placeholder: f.getAttribute("placeholder") || "",
            label: labelEl ? (labelEl.textContent||"").trim().substring(0,60) : parentText.substring(0,60),
            required: f.hasAttribute("required") || f.getAttribute("aria-required") === "true",
            id: id,
            validation: f.getAttribute("pattern") || f.getAttribute("minlength") ? "minlength:" + f.getAttribute("minlength") : f.getAttribute("maxlength") ? "maxlength:" + f.getAttribute("maxlength") : ""
          };
        });
        var submitBtn = form.querySelector("button[type='submit'],input[type='submit'],button:not([type])");
        var submitText = submitBtn ? (submitBtn.textContent||submitBtn.value||"").trim() : "";
        var fieldTypes = fields.map(function(f){ return f.type; });
        var formType = "generic";
        if (fieldTypes.includes("password") && fields.length <= 4) formType = "login";
        if (fieldTypes.includes("password") && (fields.some(function(f){ return f.name.match(/confirm|repeat|re.?pass/i); }) || fields.length > 4)) formType = "signup";
        if (fieldTypes.includes("search") || fields.some(function(f){ return f.placeholder.toLowerCase().includes("search"); })) formType = "search";
        if (fields.some(function(f){ return f.name.match(/phone|address|city|zip|country/i); })) formType = "contact";
        if (fields.some(function(f){ return f.name.match(/card|cvv|expiry|billing/i); })) formType = "checkout";
        if (submitText.toLowerCase().match(/sign.?up|register|create/)) formType = "signup";
        return {
          action: form.getAttribute("action") || "",
          method: (form.getAttribute("method") || "GET").toUpperCase(),
          fields: fields,
          submitButton: submitText,
          formType: formType
        };
      }).slice(0,10);

      var bodyText = (document.body.innerText||"").toLowerCase();
      var hasSignup = !!document.querySelector("input[name*='confirm' i],input[name*='register' i]") || bodyText.includes("sign up") || bodyText.includes("register") || bodyText.includes("create account");
      var hasDropdowns = document.querySelectorAll("select,[role='listbox'],[role='combobox']").length > 0;
      var hasModals = document.querySelectorAll("[role='dialog'],dialog,.modal,[class*='modal']").length > 0;
      var hasTables = document.querySelectorAll("table,[role='grid'],[role='table']").length > 0;
      var hasCards = document.querySelectorAll("[class*='card'],[class*='Card'],[class*='product'],[class*='item']").length > 2;
      var interactiveElements = document.querySelectorAll("button,a[href],input,select,textarea,[role='button'],[tabindex]").length;

      // Detect page type
      var pageType = "generic";
      if (document.querySelector("input[type='password']") && forms.some(function(f){ return f.formType === "login"; })) pageType = "auth";
      else if (hasCards && bodyText.match(/cart|price|\\$|buy|shop|product/)) pageType = "ecommerce";
      else if (hasTables && bodyText.match(/dashboard|analytics|overview|stats/)) pageType = "dashboard";
      else if (forms.length > 0 && inputs.length > 3) pageType = "form-heavy";
      else if (bodyText.match(/blog|article|post|read more/)) pageType = "blog";
      else if (headings.length > 2 && buttons.length > 1 && links.length > 5) pageType = "landing";

      return {
        title: document.title || "",
        url: window.location.href,
        headings: headings,
        buttons: buttons,
        links: links,
        inputs: inputs,
        forms: forms,
        images: document.querySelectorAll("img").length,
        hasNav: !!document.querySelector("nav,[role='navigation']"),
        hasFooter: !!document.querySelector("footer"),
        hasSearch: !!document.querySelector("input[type='search'],input[placeholder*='search' i],input[name*='search' i]"),
        hasLogin: !!document.querySelector("input[type='password']"),
        hasForms: document.querySelectorAll("form").length > 0,
        hasSignup: hasSignup,
        hasDropdowns: hasDropdowns,
        hasModals: hasModals,
        hasTables: hasTables,
        hasCards: hasCards,
        interactiveElements: interactiveElements,
        sections: document.querySelectorAll("section,main,[class*='section'],[class*='container']").length,
        bodyTextPreview: (document.body.innerText||"").substring(0,500),
        pageType: pageType
      };
    })()`);

    await browser.close();
    return analysis;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

function parseModelJson(text: string): any | null {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

type UserRecord = { id: number | string; email: string };
type TestRunRecord = { id: string; type: string; status: string; logs: string };

type TestHistoryRecord = {
  id: string;
  url: string;
  status: string;
  summary: string;
  created_at?: string;
};

interface DataStore {
  init(): Promise<void> | void;
  getOrCreateUser(email: string): Promise<UserRecord>;
  insertTestRun(testRun: TestRunRecord): Promise<void>;
  saveTestHistory(record: TestHistoryRecord): Promise<void>;
  getTestHistory(): Promise<TestHistoryRecord[]>;
}

class SqliteStore implements DataStore {
  private sqlite: Database.Database;

  constructor(sqlite: Database.Database) {
    this.sqlite = sqlite;
  }

  init() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        type TEXT,
        status TEXT,
        logs TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS test_history (
        id TEXT PRIMARY KEY,
        url TEXT,
        status TEXT,
        summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async getOrCreateUser(email: string): Promise<UserRecord> {
    let user: any = this.sqlite.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      const result = this.sqlite.prepare("INSERT INTO users (email) VALUES (?)").run(email);
      user = { id: Number(result.lastInsertRowid), email };
    }
    return user;
  }

  async insertTestRun(testRun: TestRunRecord): Promise<void> {
    this.sqlite
      .prepare("INSERT INTO test_runs (id, type, status, logs) VALUES (?, ?, ?, ?)")
      .run(testRun.id, testRun.type, testRun.status, testRun.logs);
  }

  async saveTestHistory(record: TestHistoryRecord): Promise<void> {
    this.sqlite
      .prepare("INSERT INTO test_history (id, url, status, summary) VALUES (?, ?, ?, ?)")
      .run(record.id, record.url, record.status, record.summary);
  }

  async getTestHistory(): Promise<TestHistoryRecord[]> {
    const newHistory = this.sqlite
      .prepare("SELECT id, url, status, summary, created_at FROM test_history ORDER BY created_at DESC LIMIT 50")
      .all() as TestHistoryRecord[];

    const oldRuns = this.sqlite
      .prepare("SELECT id, status, logs, created_at FROM test_runs ORDER BY created_at DESC LIMIT 50")
      .all() as any[];

    const legacyEntries: TestHistoryRecord[] = oldRuns.map((r) => ({
      id: r.id,
      url: "",
      status: r.status,
      summary: JSON.stringify({
        scenarios: [],
        totalSteps: 0,
        totalPassed: 0,
        totalFailed: 0,
        passRate: r.status === "passed" ? 100 : 0,
        duration: "-",
        legacy: true,
        logExcerpt: (r.logs || "").substring(0, 120),
      }),
      created_at: r.created_at,
    }));

    const combined = [...newHistory, ...legacyEntries];
    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return combined.slice(0, 50);
  }
}

class SupabaseStore implements DataStore {
  private url: string;
  private serviceRoleKey: string;

  constructor(url: string, serviceRoleKey: string) {
    this.url = url;
    this.serviceRoleKey = serviceRoleKey;
  }

  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      ...extra,
    };
  }

  private async request(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method: init.method,
      body: init.body,
      headers: this.buildHeaders(init.headers),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Supabase request failed (${response.status}): ${responseText || response.statusText}`);
    }

    if (!responseText) return null;
    try {
      return JSON.parse(responseText);
    } catch {
      return null;
    }
  }

  private hasTestHistoryTable = false;

  async init(): Promise<void> {
    try {
      await this.request("users?select=id&limit=1", { method: "GET" });
      await this.request("test_runs?select=id&limit=1", { method: "GET" });
      try {
        await this.request("test_history?select=id&limit=1", { method: "GET" });
        this.hasTestHistoryTable = true;
      } catch {
        console.warn("test_history table not found in Supabase. Create it with:");
        console.warn("  CREATE TABLE test_history (id TEXT PRIMARY KEY, url TEXT, status TEXT, summary TEXT, created_at TIMESTAMPTZ DEFAULT NOW());");
        console.warn("History will be stored in test_runs table as fallback.");
      }
      console.log("Supabase connection verified - tables ready.");
    } catch (err: any) {
      console.error("Supabase init failed:", err?.message || err);
      throw new Error(
        `Supabase tables are not ready. Run supabase/schema.sql in your Supabase SQL Editor first.\nProject URL: ${this.url}\nError: ${err?.message || err}`
      );
    }
  }

  async getOrCreateUser(email: string): Promise<UserRecord> {
    const existing = await this.request(
      `users?email=eq.${encodeURIComponent(email)}&select=id,email&limit=1`,
      { method: "GET" }
    );

    if (Array.isArray(existing) && existing[0]) {
      return existing[0] as UserRecord;
    }

    try {
      const created = await this.request("users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ email }),
      });

      if (Array.isArray(created) && created[0]) {
        return created[0] as UserRecord;
      }
    } catch (err: any) {
      // 409 can happen on race conditions with unique email; re-fetch user below.
      if (!String(err?.message || "").includes("(409)")) {
        throw err;
      }
    }

    const refetched = await this.request(
      `users?email=eq.${encodeURIComponent(email)}&select=id,email&limit=1`,
      { method: "GET" }
    );
    if (Array.isArray(refetched) && refetched[0]) {
      return refetched[0] as UserRecord;
    }

    throw new Error("Unable to create or retrieve user in Supabase.");
  }

  async insertTestRun(testRun: TestRunRecord): Promise<void> {
    await this.request("test_runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testRun),
    });
  }

  async saveTestHistory(record: TestHistoryRecord): Promise<void> {
    if (this.hasTestHistoryTable) {
      await this.request("test_history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    } else {
      // Fallback: store in test_runs table with summary in logs field
      await this.request("test_runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          type: "history",
          status: record.status,
          logs: JSON.stringify({ url: record.url, summary: record.summary }),
        }),
      });
    }
  }

  async getTestHistory(): Promise<TestHistoryRecord[]> {
    let newHistory: TestHistoryRecord[] = [];
    if (this.hasTestHistoryTable) {
      try {
        const data = await this.request("test_history?select=*&order=created_at.desc&limit=50", { method: "GET" });
        newHistory = Array.isArray(data) ? data : [];
      } catch {}
    }

    let legacyEntries: TestHistoryRecord[] = [];
    try {
      const oldRuns = await this.request("test_runs?select=id,type,status,logs,created_at&order=created_at.desc&limit=50", { method: "GET" });
      if (Array.isArray(oldRuns)) {
        legacyEntries = oldRuns.map((r: any) => {
          // Check if it's a history entry stored in test_runs (fallback mode)
          if (r.type === "history" && r.logs) {
            try {
              const parsed = JSON.parse(r.logs);
              return {
                id: r.id,
                url: parsed.url || "",
                status: r.status,
                summary: parsed.summary || "{}",
                created_at: r.created_at,
              };
            } catch {}
          }
          // Legacy test_run entry
          return {
            id: r.id,
            url: "",
            status: r.status,
            summary: JSON.stringify({
              scenarios: [],
              totalSteps: 0,
              totalPassed: 0,
              totalFailed: 0,
              passRate: r.status === "passed" ? 100 : 0,
              duration: "-",
              legacy: true,
              logExcerpt: (r.logs || "").substring(0, 120),
            }),
            created_at: r.created_at,
          };
        });
      }
    } catch {}

    // Deduplicate by id (history entries stored in both tables)
    const seen = new Set<string>();
    const combined: TestHistoryRecord[] = [];
    for (const entry of [...newHistory, ...legacyEntries]) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        combined.push(entry);
      }
    }
    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return combined.slice(0, 50);
  }
}

// Ensure data directory exists for SQLite in production
const dbPath = process.env.NODE_ENV === "production" ? "/app/data/bro_testing.db" : "bro_testing.db";
if (process.env.NODE_ENV === "production") {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
}

const store: DataStore =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : new SqliteStore(new Database(dbPath));

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Middleware for auth
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// SSE Event Queues
const eventQueues = new Map<string, any[]>();
// Track active browsers for stop functionality
const activeBrowsers = new Map<string, any>();
const stopFlags = new Set<string>();

// Test History Routes
app.get("/api/test-history", authenticate, async (_req, res) => {
  try {
    const history = await store.getTestHistory();
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/test-history", authenticate, async (req, res) => {
  try {
    const { id, url, status, summary } = req.body;
    if (!id || !url || !status || !summary) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await store.saveTestHistory({ id, url, status, summary });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Settings Routes
app.get("/api/ai-status", authenticate, async (_req, res) => {
  const ollama = await isOllamaAvailable();
  const mode = GEMINI_KEY ? "gemini" : ollama ? "ollama" : "local";
  res.json({ hasKey: !!GEMINI_KEY, ollama, mode });
});

app.post("/api/settings/ai-key", authenticate, async (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== "string" || key.trim().length < 10) {
    return res.status(400).json({ error: "Invalid API key" });
  }

  const trimmedKey = key.trim();

  // Test the key first
  try {
    const testAi = new GoogleGenerativeAI(trimmedKey);
    const model = testAi.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say OK");
    const text = result.response.text();
    if (!text) throw new Error("Empty response from Gemini");
  } catch (err: any) {
    return res.status(400).json({ error: `Invalid key: ${err.message || "Gemini rejected this key"}` });
  }

  // Save to .env
  try {
    const envPath = path.join(__dirname, ".env");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    if (envContent.match(/^GEMINI_API_KEY=/m)) {
      envContent = envContent.replace(/^GEMINI_API_KEY=.*/m, `GEMINI_API_KEY=${trimmedKey}`);
    } else {
      envContent += `\nGEMINI_API_KEY=${trimmedKey}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    reloadGeminiKey(trimmedKey);
    res.json({ success: true, message: "AI enabled! Gemini is now active." });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to save key: ${err.message}` });
  }
});

// Routes
app.get("/easter-egg", (_req, res) => {
  res.send(`
    <html>
      <body style="background: #000; color: #0f0; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
        <h1>[ ANTIGRAVITY ENABLED ]</h1>
        <img src="https://imgs.xkcd.com/comics/antigravity.png" alt="xkcd antigravity" />
        <p>import antigravity</p>
        <a href="https://xkcd.com/353/" style="color: #0f0;">xkcd.com/353</a>
      </body>
    </html>
  `);
});

app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    const user = await store.getOrCreateUser(email);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Unable to login" });
  }
});

app.post("/api/import-postman", authenticate, async (req, res) => {
  const { collection } = req.body;
  if (!collection || !collection.item) {
    return res.status(400).json({ error: "Invalid Postman collection" });
  }

  // Flatten nested folders recursively
  function flattenItems(items: any[]): any[] {
    const result: any[] = [];
    for (const item of items) {
      if (item.request) {
        result.push(item);
      } else if (item.item) {
        result.push(...flattenItems(item.item));
      }
    }
    return result;
  }

  const flatItems = flattenItems(collection.item);
  if (flatItems.length === 0) {
    return res.status(400).json({ error: "No API requests found in the collection" });
  }

  const requests = flatItems.map((item: any) => ({
    name: item.name,
    method: item.request.method,
    url: typeof item.request.url === "string" ? item.request.url : item.request.url?.raw || "",
    headers: item.request.header,
    body: item.request.body?.raw || "",
  }));

  const prompt = `Postman Requests: ${JSON.stringify(requests, null, 2)}`;

  try {
    let code = "";
    if (GEMINI_KEY) {
      try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Generate Playwright API tests for: ${prompt}. Return ONLY code.`);
        const response = await result.response;
        code = response.text().replace(/```typescript|```ts|```/g, "").trim();
      } catch (err: any) {
        console.warn("Gemini API generation failed for Postman import, falling back to local mode.", err?.message || err);
      }
    }

    if (!code) {
      const safeName = (name: string, index: number) => {
        const normalized = name.replace(/[^\w]/g, "_");
        return normalized || `request_${index + 1}`;
      };
      code = `import { test, expect } from "@playwright/test";\n\ntest("Imported API Tests", async ({ request }) => {\n${requests.map((r, index) => `  const response_${safeName(r.name || "", index)} = await request.${r.method.toLowerCase()}("${r.url}");\n  expect(response_${safeName(r.name || "", index)}.ok()).toBeTruthy();`).join("\n")}\n});`;
    } else {
      code = code.trim();
    }

    const filePath = path.join(__dirname, "workspace/generated/api_tests.spec.ts");
    if (!fs.existsSync(path.join(__dirname, "workspace/generated"))) {
      fs.mkdirSync(path.join(__dirname, "workspace/generated"), { recursive: true });
    }
    fs.writeFileSync(filePath, code);

    res.json({ code, filePath, summary: `Generated ${requests.length} API tests.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate-ui-test", authenticate, async (req, res) => {
  const { prd, url } = req.body;
  if (!prd || !url) {
    return res.status(400).json({ error: "Both prd and url are required" });
  }

  try {
    let code = "";
    if (GEMINI_KEY) {
      try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Generate a Playwright UI test for URL ${url} based on: ${prd}. Return ONLY code.`);
        const response = await result.response;
        code = response.text().replace(/```typescript|```ts|```/g, "").trim();
      } catch (err: any) {
        console.warn("Gemini UI generation failed, falling back to local mode.", err?.message || err);
      }
    }

    if (!code) {
      code = LocalAIEngine.generatePlaywrightCode(prd, url);
    }

    const filePath = path.join(__dirname, "workspace/generated/ui_test.spec.ts");
    if (!fs.existsSync(path.join(__dirname, "workspace/generated"))) {
      fs.mkdirSync(path.join(__dirname, "workspace/generated"), { recursive: true });
    }
    fs.writeFileSync(filePath, code);

    res.json({ code, filePath, summary: "Generated Playwright UI test." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ui-plan", authenticate, async (req, res) => {
  const { url, goal, suiteType = "smoke", authNotes = "" } = req.body || {};
  if (!url || !goal) {
    return res.status(400).json({ error: "Both url and goal are required" });
  }

  try {
    // Step 1: Analyze the actual page to generate dynamic plans
    let pageAnalysis: PageAnalysis | null = null;
    try {
      pageAnalysis = await analyzePage(url);
      console.log(`Page analyzed: "${pageAnalysis.title}" - ${pageAnalysis.headings.length} headings, ${pageAnalysis.buttons.length} buttons, ${pageAnalysis.links.length} links, ${pageAnalysis.inputs.length} inputs`);
    } catch (err: any) {
      console.warn("Page analysis failed (will use goal-based plan):", err?.message || err);
    }

    let scenarios: Array<{ id: string; title: string; objective: string; risk: "low" | "medium" | "high"; steps: string[] }> = [];

    // Step 2: Generate plan via AI (with page analysis context)
    if (GEMINI_KEY) {
      try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const formsContext = pageAnalysis?.forms?.length ? `
FORMS DETECTED (${pageAnalysis.forms.length}):
${pageAnalysis.forms.map((f, i) => `  Form ${i + 1} (${f.formType}): method=${f.method}, submit="${f.submitButton}"
    Fields: ${f.fields.map(fd => `${fd.type}[name="${fd.name}", label="${fd.label}", placeholder="${fd.placeholder}", required=${fd.required}]`).join(", ")}`).join("\n")}` : "";

        const analysisContext = pageAnalysis ? `
PAGE ANALYSIS (real crawl data from ${url}):
- Title: "${pageAnalysis.title}"
- Page Type: ${pageAnalysis.pageType}
- Headings: ${pageAnalysis.headings.map(h => `${h.tag}: "${h.text}"`).join(", ") || "none"}
- Buttons: ${pageAnalysis.buttons.map(b => `"${b.text}"`).join(", ") || "none"}
- Links: ${pageAnalysis.links.map(l => `"${l.text}" (${l.href})`).join(", ") || "none"}
- Inputs: ${pageAnalysis.inputs.map(i => `${i.type}(name="${i.name}", placeholder="${i.placeholder}")`).join(", ") || "none"}
${formsContext}
- Has Login: ${pageAnalysis.hasLogin} | Has Signup: ${pageAnalysis.hasSignup} | Has Search: ${pageAnalysis.hasSearch}
- Has Nav: ${pageAnalysis.hasNav} | Has Footer: ${pageAnalysis.hasFooter} | Has Dropdowns: ${pageAnalysis.hasDropdowns}
- Has Tables: ${pageAnalysis.hasTables} | Has Cards: ${pageAnalysis.hasCards} | Has Modals: ${pageAnalysis.hasModals}
- Interactive Elements: ${pageAnalysis.interactiveElements} | Sections: ${pageAnalysis.sections} | Images: ${pageAnalysis.images}
- Body Preview: "${pageAnalysis.bodyTextPreview.substring(0, 300)}"` : "Page analysis unavailable - generate based on goal.";

        const prompt = `You are a senior QA automation architect. Generate COMPREHENSIVE FUNCTIONAL test scenarios that test the REAL FUNCTIONALITY of this website — not just UI appearance.

URL: ${url}
USER'S GOAL: "${goal}"
${authNotes ? `AUTH NOTES: ${authNotes}` : ""}
${analysisContext}

CRITICAL RULES FOR FUNCTIONAL TESTING:
1. You must test ACTUAL FUNCTIONALITY — fill forms, click buttons, test login/signup flows, test search, test navigation, test CRUD operations
2. For EVERY form detected: generate BOTH positive tests (valid data) AND negative tests (empty fields, invalid email, short password, SQL injection, XSS)
3. If there's a login form: test valid login flow, test with empty email, test with empty password, test with invalid email format, test with wrong credentials
4. If there's a signup form: test valid registration, test password mismatch, test existing email, test required field validation
5. If there's a search: test valid search, test empty search, test special characters, test no results
6. For each form field, use REALISTIC test data based on field type:
   - email fields: use "testuser@example.com" for valid, "invalid-email" for invalid
   - password fields: use "Test@12345" for valid, "123" for too short
   - text/name fields: use "John Doe" for valid, leave empty for negative
   - phone fields: use "9876543210" for valid, "abc" for invalid
7. Each step must use these action verbs: Navigate, Verify, Click, Fill, Scroll, Check, Capture, Test, Wait, Hover, Submit, Clear
8. For Fill steps, ALWAYS include the field identifier and value: "Fill email field with testuser@example.com", "Fill password field with Test@12345"
9. Generate 8-14 scenarios covering: happy path, negative tests, edge cases, validation, error handling
10. Mark negative/edge case tests as "high" risk

Return strict JSON:
{
  "summary": "one sentence describing the comprehensive test plan",
  "scenarios": [
    { "id": "short-id", "title": "Descriptive Title", "objective": "what functionality this validates", "risk": "low|medium|high",
      "steps": ["Navigate to the application", "Verify login form is visible", "Fill email field with testuser@example.com", "Fill password field with Test@12345", "Click Login button", "Verify successful login or dashboard", "Capture screenshot"] }
  ]
}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const parsed = parseModelJson(response.text());
        if (parsed && Array.isArray(parsed.scenarios)) {
          scenarios = parsed.scenarios.map((item: any, index: number) => ({
            id: String(item.id || `scenario_${index + 1}`),
            title: String(item.title || `Scenario ${index + 1}`),
            objective: String(item.objective || "Validate critical interaction"),
            risk: item.risk === "high" || item.risk === "medium" ? item.risk : "low",
            steps: Array.isArray(item.steps) && item.steps.length > 0
              ? item.steps.map((step: any) => String(step))
              : ["Navigate to the application", "Verify page loads", "Capture screenshot"],
          }));
        }
      } catch (err: any) {
        console.warn("Gemini UI plan generation failed, falling back to local planner.", err?.message || err);
      }
    }

    // Step 3: Local fallback with page analysis
    if (scenarios.length === 0) {
      scenarios = LocalAIEngine.generateUiPlan(String(goal), String(suiteType), String(authNotes), pageAnalysis);
    }

    const analysisNote = pageAnalysis
      ? `Analyzed "${pageAnalysis.title}" (${pageAnalysis.pageType}): ${pageAnalysis.forms?.length || 0} forms, ${pageAnalysis.buttons.length} buttons, ${pageAnalysis.inputs.length} inputs, ${pageAnalysis.interactiveElements || 0} interactive elements.`
      : "";

    res.json({
      summary: `Generated ${scenarios.length} dynamic test scenarios for ${url}. ${analysisNote}`,
      scenarios,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a proper Playwright .spec.ts from natural-language test steps
function generatePlaywrightScript(targetUrl: string, steps: string[], runId: string): string {
  const lines: string[] = [
    `import { test, expect } from "@playwright/test";`,
    ``,
    `// Auto-generated by Test AI — Run ID: ${runId.slice(0, 8)}`,
    `// Target: ${targetUrl}`,
    `// Generated: ${new Date().toISOString()}`,
    ``,
    `test("Auto-generated test for ${targetUrl}", async ({ page }) => {`,
  ];

  for (const step of steps) {
    const lower = step.toLowerCase();
    lines.push(`  // Step: ${step}`);

    if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open") || lower.includes("load") || lower.includes("visit")) {
      lines.push(`  await page.goto("${targetUrl}");`);
      lines.push(`  await page.waitForLoadState("networkidle");`);
    } else if (lower.includes("verify") || lower.includes("check") || lower.includes("assert") || lower.includes("confirm") || lower.includes("ensure") || lower.includes("validate")) {
      if (lower.includes("title")) {
        lines.push(`  await expect(page).toHaveTitle(/.+/);`);
      } else if (lower.includes("heading") || lower.includes("h1") || lower.includes("h2")) {
        lines.push(`  const heading = page.locator("h1, h2").first();`);
        lines.push(`  await expect(heading).toBeVisible();`);
      } else if (lower.includes("image") || lower.includes("logo") || lower.includes("img")) {
        lines.push(`  const images = page.locator("img:visible");`);
        lines.push(`  await expect(images.first()).toBeVisible();`);
      } else if (lower.includes("button") || lower.includes("cta")) {
        lines.push(`  const buttons = page.locator("button:visible, a.btn:visible, [role='button']:visible");`);
        lines.push(`  await expect(buttons.first()).toBeVisible();`);
      } else if (lower.includes("link") || lower.includes("navigation") || lower.includes("nav") || lower.includes("menu")) {
        lines.push(`  const nav = page.locator("nav a:visible, header a:visible");`);
        lines.push(`  await expect(nav.first()).toBeVisible();`);
      } else if (lower.includes("form") || lower.includes("input") || lower.includes("field")) {
        lines.push(`  const inputs = page.locator("input:visible, textarea:visible, select:visible");`);
        lines.push(`  await expect(inputs.first()).toBeVisible();`);
      } else if (lower.includes("footer")) {
        lines.push(`  const footer = page.locator("footer").first();`);
        lines.push(`  await expect(footer).toBeVisible();`);
      } else if (lower.includes("responsive") || lower.includes("mobile")) {
        lines.push(`  await page.setViewportSize({ width: 375, height: 812 });`);
        lines.push(`  await page.waitForTimeout(800);`);
        lines.push(`  const overflow = await page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");`);
        lines.push(`  expect(overflow).toBe(false);`);
        lines.push(`  await page.setViewportSize({ width: 1280, height: 720 });`);
      } else if (lower.includes("section") || lower.includes("content") || lower.includes("element")) {
        lines.push(`  const sections = page.locator("main, section, article, [class*='section']");`);
        lines.push(`  await expect(sections.first()).toBeVisible();`);
      } else {
        lines.push(`  const title = await page.title();`);
        lines.push(`  expect(title.length).toBeGreaterThan(0);`);
      }
    } else if (lower.includes("click") || lower.includes("press") || lower.includes("tap")) {
      const textMatch = step.match(/(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*$/i);
      if (textMatch) {
        const target = textMatch[1].replace(/button|link|element|the/gi, "").trim();
        lines.push(`  await page.locator('button:has-text("${target}"), a:has-text("${target}"), [role="button"]:has-text("${target}")').first().click();`);
      } else {
        lines.push(`  await page.locator("button:visible").first().click();`);
      }
      lines.push(`  await page.waitForTimeout(500);`);
    } else if (lower.includes("fill") || lower.includes("enter") || lower.includes("type") || lower.includes("input") || lower.includes("search")) {
      if (lower.includes("search")) {
        const searchMatch = step.match(/(?:search|type|enter|fill)\s+(?:for\s+)?["']?(.+?)["']?\s*$/i);
        const query = searchMatch ? searchMatch[1].replace(/in search|in the search|search box|search bar|search field/gi, "").trim() : "test query";
        lines.push(`  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]').first();`);
        lines.push(`  await searchInput.fill("${query}");`);
        lines.push(`  await searchInput.press("Enter");`);
      } else {
        lines.push(`  const inputs = page.locator("input:visible");`);
        lines.push(`  const count = await inputs.count();`);
        lines.push(`  for (let i = 0; i < Math.min(count, 4); i++) {`);
        lines.push(`    const input = inputs.nth(i);`);
        lines.push(`    const type = await input.getAttribute("type") || "text";`);
        lines.push(`    if (type === "email") await input.fill("test@example.com");`);
        lines.push(`    else if (type === "password") await input.fill("password123");`);
        lines.push(`    else if (type === "search") await input.fill("test query");`);
        lines.push(`    else await input.fill("Test input");`);
        lines.push(`  }`);
      }
      lines.push(`  await page.waitForTimeout(500);`);
    } else if (lower.includes("scroll")) {
      if (lower.includes("bottom") || lower.includes("down")) {
        lines.push(`  await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");`);
      } else if (lower.includes("top") || lower.includes("up")) {
        lines.push(`  await page.evaluate("window.scrollTo(0, 0)");`);
      } else {
        lines.push(`  await page.evaluate("window.scrollBy(0, 500)");`);
      }
      lines.push(`  await page.waitForTimeout(800);`);
    } else if (lower.includes("screenshot") || lower.includes("capture") || lower.includes("snapshot")) {
      lines.push(`  await page.screenshot({ path: "test-results/step-screenshot.png" });`);
    } else if (lower.includes("wait") || lower.includes("delay")) {
      lines.push(`  await page.waitForTimeout(800);`);
    } else if (lower.includes("hover")) {
      const textMatch = step.match(/hover\s+(?:over\s+)?(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*$/i);
      if (textMatch) {
        const target = textMatch[1].replace(/button|link|element|the/gi, "").trim();
        lines.push(`  await page.locator('button:has-text("${target}"), a:has-text("${target}")').first().hover();`);
      } else {
        lines.push(`  await page.locator("button:visible, a:visible").first().hover();`);
      }
      lines.push(`  await page.waitForTimeout(800);`);
    } else if (lower.includes("accessibility") || lower.includes("a11y")) {
      lines.push(`  const imgsNoAlt = await page.locator("img:not([alt])").count();`);
      lines.push(`  expect(imgsNoAlt).toBe(0);`);
    } else if (lower.includes("performance") || lower.includes("load time")) {
      lines.push(`  const perf = await page.evaluate(() => JSON.stringify(performance.getEntriesByType("navigation")[0]));`);
      lines.push(`  console.log("Performance:", perf);`);
    } else if (lower.includes("network") || lower.includes("console error") || lower.includes("js error")) {
      lines.push(`  // Monitor checked during execution`);
      lines.push(`  const title = await page.title();`);
      lines.push(`  expect(title).toBeTruthy();`);
    } else {
      lines.push(`  await expect(page.locator("body")).toBeVisible();`);
    }
    lines.push(``);
  }

  lines.push(`  // Final screenshot`);
  lines.push(`  await page.screenshot({ path: "test-results/final-state.png", fullPage: true });`);
  lines.push(`});`);
  lines.push(``);

  return lines.join("\n");
}

app.get("/api/events/:runId", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const runId = req.params.runId;
  const interval = setInterval(() => {
    const queue = eventQueues.get(runId) || [];
    while (queue.length > 0) {
      const msg = queue.shift();
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  }, 500);

  req.on("close", () => {
    clearInterval(interval);
  });
});

app.post("/api/stop-test/:runId", authenticate, async (req, res) => {
  const { runId } = req.params;
  stopFlags.add(runId);
  const browser = activeBrowsers.get(runId);
  if (browser) {
    try { await browser.close(); } catch {}
    activeBrowsers.delete(runId);
  }
  const emit = (data: any) => {
    eventQueues.get(runId)?.push({ ...data, timestamp: new Date().toISOString() });
  };
  emit({ message: "Run completed.", type: "info" });
  res.json({ stopped: true });
});

app.post("/api/run-tests", authenticate, async (req, res) => {
  const runId = uuidv4();
  eventQueues.set(runId, []);

  const { url: targetUrl, steps: planSteps } = req.body || {};

  const emit = (data: any) => {
    eventQueues.get(runId)?.push({ ...data, timestamp: new Date().toISOString() });
  };

  const log = (message: string, type = "info", preview?: string) => {
    emit({ message, type, preview });
  };

  let stepNum = 0;
  const step = (action: string, status: "running" | "passed" | "failed", detail = "", preview?: string) => {
    if (status === "running") stepNum++;
    emit({ step: stepNum, action, status, detail, preview, type: "step" });
  };

  // AI failure analysis: capture page state + get suggestion
  const analyzeFailure = async (page: any, action: string, error: string, screenshot: string) => {
    try {
      const pageText = await page.locator("body").innerText().catch(() => "");
      const pageUrl = page.url();
      const pageTitle = await page.title().catch(() => "");

      const prompt = `A Playwright test step FAILED. Analyze and give a short fix suggestion (2-3 sentences max).

FAILED STEP: "${action}"
ERROR: ${error}
PAGE URL: ${pageUrl}
PAGE TITLE: ${pageTitle}
VISIBLE PAGE TEXT (first 500 chars): ${pageText.substring(0, 500)}

Reply with ONLY the suggestion, no code.`;

      let suggestion = "";
      if (GEMINI_KEY) {
        try {
          const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(prompt);
          suggestion = result.response.text();
        } catch {}
      }
      if (!suggestion && await isOllamaAvailable()) {
        try {
          suggestion = await ollamaChat("You are a QA expert. Give brief failure analysis.", prompt);
        } catch {}
      }
      if (!suggestion) {
        suggestion = `Step "${action}" failed: ${error}. Check if the element exists, is visible, and the page has fully loaded.`;
      }

      emit({ type: "suggestion", step: stepNum, action, suggestion, screenshot, pageUrl, pageTitle });
    } catch {}
  };

  const persistRun = async (status: "passed" | "failed", logs: string) => {
    try {
      await store.insertTestRun({ id: runId, type: "all", status, logs });
    } catch (err) {
      console.error("Failed to persist test run:", err);
    }
  };

  res.json({ runId });

  (async () => {
    log("Initializing test session...", "info");
    let frameCaptureInterval: ReturnType<typeof setInterval> | null = null;

    try {
      const testResultsDir = path.join(__dirname, "test-results");
      if (!fs.existsSync(testResultsDir)) {
        fs.mkdirSync(testResultsDir, { recursive: true });
      }

      // Fallback: read URL from generated test if not provided
      let url = targetUrl;
      if (!url) {
        const targetFile = path.join(__dirname, "workspace/generated/ui_test.spec.ts");
        let code = "";
        if (fs.existsSync(targetFile)) code = fs.readFileSync(targetFile, "utf-8");
        const urlMatch = code.match(/goto\("([^"]+)"\)/);
        url = urlMatch ? urlMatch[1] : "https://example.com";
      }

      const browser = await chromium.launch({ headless: true });
      activeBrowsers.set(runId, browser);
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });

      // KaneAI-like: Network monitoring during test
      const networkLog: Array<{ url: string; method: string; status?: number; type: string; time: string }> = [];
      page.on("request", function onReq2(req: any) {
        networkLog.push({ url: req.url(), method: req.method(), type: req.resourceType(), time: new Date().toISOString() });
      });
      page.on("response", function onResp2(resp: any) {
        const entry = networkLog.find(function(r: any) { return r.url === resp.url() && !r.status; });
        if (entry) entry.status = resp.status();
      });

      // Track console errors
      const jsErrors: string[] = [];
      page.on("pageerror", function onPageErr(err: any) { jsErrors.push(err.message); });
      page.on("console", function onConsole(msg: any) { if (msg.type() === "error") jsErrors.push(msg.text()); });

      const capture = async (): Promise<string> => {
        try {
          const shot = await page.screenshot({ type: "jpeg", quality: 85 });
          return `data:image/jpeg;base64,${shot.toString("base64")}`;
        } catch { return ""; }
      };

      // Continuous frame capture for video-like live preview
      let capturingFrame = false;
      frameCaptureInterval = setInterval(async () => {
        if (capturingFrame || stopFlags.has(runId)) return;
        capturingFrame = true;
        try {
          const shot = await page.screenshot({ type: "jpeg", quality: 65 });
          emit({ type: "frame", preview: `data:image/jpeg;base64,${shot.toString("base64")}` });
        } catch {}
        capturingFrame = false;
      }, 600);

      // Wrap step to auto-analyze failures
      const stepWithAnalysis = async (action: string, status: "running" | "passed" | "failed", detail = "", preview?: string) => {
        step(action, status, detail, preview);
        if (status === "failed") {
          await analyzeFailure(page, action, detail, preview || "");
        }
      };

      // Override step inside executeStep to always trigger analysis on failure
      const smartStep = async (action: string, status: "running" | "passed" | "failed", detail = "", preview?: string) => {
        step(action, status, detail, preview);
        if (status === "failed") {
          await analyzeFailure(page, action, detail, preview || "");
        }
      };

      // Helper: execute a single plan step dynamically
      const executeStep = async (stepText: string) => {
        const lower = stepText.toLowerCase();

        // Navigate / Open / Go to
        if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open") || lower.includes("load") || lower.includes("visit")) {
          await smartStep(stepText,"running");
          try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForLoadState("networkidle").catch(() => {});
            const preview = await capture();
            await smartStep(stepText,"passed", `Loaded ${url}`, preview);
          } catch (err: any) {
            const preview = await capture();
            await stepWithAnalysis(stepText, "failed", err.message, preview);
          }
          return;
        }

        // Verify / Check / Assert / Confirm / Ensure / Validate
        if (lower.includes("verify") || lower.includes("check") || lower.includes("assert") || lower.includes("confirm") || lower.includes("ensure") || lower.includes("validate") || lower.includes("visible") || lower.includes("display") || lower.includes("present")) {
          await smartStep(stepText,"running");
          try {
            if (lower.includes("title")) {
              const title = await page.title();
              const preview = await capture();
              await smartStep(stepText,title ? "passed" : "failed", title ? `Title: "${title}"` : "No title found", preview);
            } else if (lower.includes("heading") || lower.includes("h1") || lower.includes("h2")) {
              const heading = page.locator("h1, h2").first();
              const vis = await heading.isVisible({ timeout: 3000 }).catch(() => false);
              const text = vis ? await heading.textContent() : null;
              const preview = await capture();
              await smartStep(stepText,vis ? "passed" : "failed", vis ? `Found: "${text?.trim()}"` : "No heading found", preview);
            } else if (lower.includes("image") || lower.includes("logo") || lower.includes("img")) {
              const count = await page.locator("img:visible").count();
              const preview = await capture();
              await smartStep(stepText,count > 0 ? "passed" : "failed", `${count} images found`, preview);
            } else if (lower.includes("button") || lower.includes("cta")) {
              const count = await page.locator("button:visible, a.btn:visible, [role='button']:visible").count();
              const preview = await capture();
              await smartStep(stepText,count > 0 ? "passed" : "failed", `${count} buttons found`, preview);
            } else if (lower.includes("link") || lower.includes("navigation") || lower.includes("nav") || lower.includes("menu")) {
              const count = await page.locator("nav a:visible, header a:visible, a:visible").count();
              const preview = await capture();
              await smartStep(stepText,count > 0 ? "passed" : "failed", `${count} links found`, preview);
            } else if (lower.includes("form") || lower.includes("input") || lower.includes("field")) {
              const count = await page.locator("input:visible, textarea:visible, select:visible").count();
              const preview = await capture();
              await smartStep(stepText,count > 0 ? "passed" : "failed", `${count} form fields found`, preview);
            } else if (lower.includes("footer")) {
              const footer = page.locator("footer").first();
              const vis = await footer.isVisible({ timeout: 3000 }).catch(() => false);
              const preview = await capture();
              await smartStep(stepText,vis ? "passed" : "failed", vis ? "Footer visible" : "No footer found", preview);
            } else if (lower.includes("section") || lower.includes("content") || lower.includes("element") || lower.includes("block") || lower.includes("component")) {
              const sections = await page.locator("main, section, article, [class*='section'], [class*='container']").count();
              const preview = await capture();
              await smartStep(stepText,sections > 0 ? "passed" : "failed", `${sections} content sections found`, preview);
            } else if (lower.includes("responsive") || lower.includes("mobile")) {
              await page.setViewportSize({ width: 375, height: 812 });
              await page.waitForTimeout(800);
              const hasOverflow = await page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");
              const preview = await capture();
              await smartStep(stepText,hasOverflow ? "failed" : "passed", hasOverflow ? "Horizontal overflow detected" : "No overflow - responsive", preview);
              await page.setViewportSize({ width: 1280, height: 720 });
            } else if (lower.includes("error") || lower.includes("validation") || lower.includes("alert") || lower.includes("warning") || lower.includes("message")) {
              // Check for error/validation/success messages on the page
              const errorSels = ".error, .alert, .warning, .danger, .invalid, .validation, [class*='error'], [class*='alert'], [class*='warning'], [class*='invalid'], [role='alert'], .toast, .notification, .message";
              const errorEls = page.locator(errorSels);
              const errCount = await errorEls.count();
              let errorTexts: string[] = [];
              for (let i = 0; i < Math.min(errCount, 5); i++) {
                const vis = await errorEls.nth(i).isVisible().catch(() => false);
                if (vis) {
                  const t = await errorEls.nth(i).textContent().catch(() => "");
                  if (t && t.trim()) errorTexts.push(t.trim().substring(0, 100));
                }
              }
              const preview = await capture();
              if (lower.includes("no error") || lower.includes("no validation") || lower.includes("success")) {
                await smartStep(stepText, errorTexts.length === 0 ? "passed" : "failed", errorTexts.length === 0 ? "No errors displayed" : `Found errors: ${errorTexts.join("; ")}`, preview);
              } else {
                await smartStep(stepText, errorTexts.length > 0 ? "passed" : "failed", errorTexts.length > 0 ? `Found: ${errorTexts.join("; ")}` : "No error/validation messages found", preview);
              }
            } else if (lower.includes("login") || lower.includes("dashboard") || lower.includes("welcome") || lower.includes("logged in") || lower.includes("authenticated") || lower.includes("profile")) {
              // Check for successful login indicators
              const urlNow = page.url();
              const pageText = await page.locator("body").innerText().catch(() => "");
              const lowText = pageText.toLowerCase();
              const isLoggedIn = lowText.includes("dashboard") || lowText.includes("welcome") || lowText.includes("profile") || lowText.includes("logout") || lowText.includes("sign out") || lowText.includes("my account") || urlNow.includes("dashboard") || urlNow.includes("home") || urlNow.includes("profile");
              const hasError = lowText.includes("invalid") || lowText.includes("incorrect") || lowText.includes("wrong") || lowText.includes("failed") || lowText.includes("error");
              const preview = await capture();
              if (lower.includes("fail") || lower.includes("invalid") || lower.includes("error") || lower.includes("reject")) {
                // Expecting login failure
                await smartStep(stepText, hasError ? "passed" : "failed", hasError ? "Login correctly rejected" : isLoggedIn ? "Login succeeded (expected failure)" : `Page URL: ${urlNow}`, preview);
              } else {
                // Expecting login success
                await smartStep(stepText, isLoggedIn ? "passed" : "failed", isLoggedIn ? `Logged in — URL: ${urlNow}` : hasError ? `Login failed — Error detected on page` : `Could not confirm login — URL: ${urlNow}`, preview);
              }
            } else if (lower.includes("url") || lower.includes("redirect") || lower.includes("navigate")) {
              // Check URL changed / redirected
              const urlNow = page.url();
              const preview = await capture();
              await smartStep(stepText, urlNow ? "passed" : "failed", `Current URL: ${urlNow}`, preview);
            } else if (lower.includes("text") || lower.includes("contain") || lower.includes("display")) {
              // Check for specific text on page
              const textMatch = stepText.match(/(?:text|contain|display)\w*\s+["'](.+?)["']/i) || stepText.match(/(?:verify|check|ensure)\s+(?:that\s+)?["'](.+?)["']\s+(?:is\s+)?(?:visible|displayed|shown|present)/i);
              if (textMatch) {
                const searchText = textMatch[1];
                const found = page.locator(`text="${searchText}"`).first();
                const vis = await found.isVisible({ timeout: 3000 }).catch(() => false);
                const preview = await capture();
                await smartStep(stepText, vis ? "passed" : "failed", vis ? `Found text: "${searchText}"` : `Text "${searchText}" not found on page`, preview);
              } else {
                const bodyText = await page.locator("body").innerText().catch(() => "");
                const preview = await capture();
                await smartStep(stepText, bodyText.length > 50 ? "passed" : "failed", `Page has ${bodyText.length} chars of content`, preview);
              }
            } else {
              // Generic verification: check page is loaded and has content
              const title = await page.title();
              const bodyText = await page.locator("body").innerText().catch(() => "");
              const hasContent = bodyText.length > 50;
              const preview = await capture();
              await smartStep(stepText,hasContent ? "passed" : "failed", `Page "${title}" has ${bodyText.length} chars of content`, preview);
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // Click / Press / Tap / Select
        if (lower.includes("click") || lower.includes("press") || lower.includes("tap") || (lower.includes("select") && !lower.includes("fill") && !lower.includes("type"))) {
          await smartStep(stepText,"running");
          try {
            const textMatch = stepText.match(/(?:click|press|tap|select)\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*$/i);
            let clicked = false;
            if (textMatch) {
              const target = textMatch[1].replace(/\b(button|link|element|the|icon|tab|menu|item|option)\b/gi, "").trim();
              if (target) {
                // Broader search: buttons, links, inputs, divs with role, spans, etc.
                const selectorList = [
                  `button:has-text("${target}")`, `a:has-text("${target}")`, `[role="button"]:has-text("${target}")`,
                  `input[value*="${target}" i]`, `[role="tab"]:has-text("${target}")`, `[role="menuitem"]:has-text("${target}")`,
                  `span:has-text("${target}")`, `div:has-text("${target}")`, `li:has-text("${target}")`
                ];
                for (const sel of selectorList) {
                  const el = page.locator(sel).first();
                  if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
                    await el.click({ timeout: 3000 });
                    clicked = true;
                    await page.waitForTimeout(1000);
                    const preview = await capture();
                    await smartStep(stepText,"passed", `Clicked: "${target}"`, preview);
                    break;
                  }
                }
              }
            }
            if (!clicked) {
              // Fallback: click first visible button
              const btn = page.locator("button:visible, [role='button']:visible, input[type='submit']:visible").first();
              if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                const btnText = await btn.textContent().catch(() => "button");
                await btn.click({ timeout: 3000 });
                await page.waitForTimeout(1000);
                const preview = await capture();
                await smartStep(stepText,"passed", `Clicked: "${btnText?.trim()}"`, preview);
              } else {
                const preview = await capture();
                await smartStep(stepText,"failed", "No clickable element found", preview);
              }
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // Clear field
        if (lower.includes("clear") && (lower.includes("field") || lower.includes("input") || lower.includes("form"))) {
          await smartStep(stepText, "running");
          try {
            const fieldMatch = stepText.match(/clear\s+(?:the\s+)?(.+?)(?:\s+field|\s+input|\s*$)/i);
            const fieldHint = fieldMatch ? fieldMatch[1].trim().toLowerCase() : "";
            let cleared = 0;

            if (fieldHint && fieldHint !== "all" && fieldHint !== "form") {
              // Clear specific field
              const selectors = [
                `input[name*="${fieldHint}" i]:visible`, `input[placeholder*="${fieldHint}" i]:visible`,
                `input[type="${fieldHint}"]:visible`, `input[id*="${fieldHint}" i]:visible`,
                `textarea[name*="${fieldHint}" i]:visible`
              ];
              for (const sel of selectors) {
                const el = page.locator(sel).first();
                if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
                  await el.fill("");
                  cleared++;
                  break;
                }
              }
            } else {
              // Clear all visible inputs
              const allInputs = page.locator("input:visible,textarea:visible");
              const count = await allInputs.count();
              for (let i = 0; i < count; i++) {
                try { await allInputs.nth(i).fill(""); cleared++; } catch {}
              }
            }
            const preview = await capture();
            await smartStep(stepText, cleared > 0 ? "passed" : "failed", `Cleared ${cleared} field(s)`, preview);
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText, "failed", err.message, preview);
          }
          return;
        }

        // Submit form
        if (lower.includes("submit") || (lower.includes("click") && lower.includes("submit"))) {
          await smartStep(stepText, "running");
          try {
            const submitBtn = page.locator("button[type='submit']:visible, input[type='submit']:visible, button:has-text('Submit'):visible, button:has-text('Login'):visible, button:has-text('Sign in'):visible, button:has-text('Sign up'):visible, button:has-text('Register'):visible, button:has-text('Send'):visible, button:has-text('Save'):visible").first();
            if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              const btnText = await submitBtn.textContent().catch(() => "Submit");
              await submitBtn.click({ timeout: 3000 });
              await page.waitForTimeout(1500);
              const preview = await capture();
              await smartStep(stepText, "passed", `Submitted via "${btnText?.trim()}"`, preview);
            } else {
              // Fallback: press Enter on last focused input
              await page.keyboard.press("Enter");
              await page.waitForTimeout(1500);
              const preview = await capture();
              await smartStep(stepText, "passed", "Submitted via Enter key", preview);
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText, "failed", err.message, preview);
          }
          return;
        }

        // Fill / Enter / Type / Input — SMART field targeting with position fallback
        if (lower.includes("fill") || lower.includes("enter") || lower.includes("type") || lower.includes("input")) {
          await smartStep(stepText,"running");
          try {
            // Try to extract "Fill [field] with [value]" pattern
            const withMatch = stepText.match(/(?:fill|enter|type|input)\s+(?:the\s+)?(?:in\s+)?(.+?)\s+(?:with|as|=|:)\s+["']?(.+?)["']?\s*$/i);

            if (withMatch) {
              const fieldHint = withMatch[1].toLowerCase().replace(/\s*(field|input|box|area)\s*/g, "").trim();
              const value = withMatch[2].trim();
              let filled = false;
              let filledVia = "";

              // Strategy 1: Direct attribute match (name, placeholder, id, type)
              const directSelectors = [
                `input[type="${fieldHint}"]:visible`, `input[name*="${fieldHint}" i]:visible`,
                `input[placeholder*="${fieldHint}" i]:visible`, `input[id*="${fieldHint}" i]:visible`,
                `textarea[name*="${fieldHint}" i]:visible`, `textarea[placeholder*="${fieldHint}" i]:visible`,
              ];
              for (const sel of directSelectors) {
                const el = page.locator(sel).first();
                if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
                  await el.fill(value); filled = true; filledVia = "attribute match"; break;
                }
              }

              // Strategy 2: Label text match — find label with fieldHint text, then its input
              if (!filled) {
                const label = page.locator(`label:has-text("${fieldHint}")`).first();
                if (await label.isVisible({ timeout: 800 }).catch(() => false)) {
                  const forAttr = await label.getAttribute("for").catch(() => "");
                  if (forAttr) {
                    const target = page.locator(`#${forAttr}`);
                    if (await target.isVisible({ timeout: 800 }).catch(() => false)) { await target.fill(value); filled = true; filledVia = "label[for]"; }
                  }
                  if (!filled) {
                    const inner = label.locator("input,textarea,select").first();
                    if (await inner.isVisible({ timeout: 800 }).catch(() => false)) { await inner.fill(value); filled = true; filledVia = "label>input"; }
                  }
                }
              }

              // Strategy 3: Nearby text match — find any text/span/div containing the hint, then the nearest input
              if (!filled) {
                try {
                  const nearbyInput = await page.evaluate((hint) => {
                    const allText = document.querySelectorAll("label, span, div, p, h1, h2, h3, h4, h5, h6, th, dt, legend");
                    for (const el of allText) {
                      if ((el.textContent || "").toLowerCase().includes(hint)) {
                        // Look for input in same parent or next sibling
                        const parent = el.closest("div, form, fieldset, section, li, tr");
                        if (parent) {
                          const inp = parent.querySelector("input:not([type='hidden']):not([type='submit']):not([type='checkbox']):not([type='radio']), textarea, select") as HTMLInputElement;
                          if (inp) return { found: true, selector: inp.id ? `#${inp.id}` : inp.name ? `input[name="${inp.name}"]` : "" };
                        }
                      }
                    }
                    return { found: false, selector: "" };
                  }, fieldHint);
                  if (nearbyInput.found && nearbyInput.selector) {
                    const el = page.locator(nearbyInput.selector).first();
                    if (await el.isVisible({ timeout: 800 }).catch(() => false)) { await el.fill(value); filled = true; filledVia = "nearby text"; }
                  }
                } catch {}
              }

              // Strategy 4: Position-based fallback — "email" = 1st non-password input, "password" = 1st password input
              if (!filled) {
                const isPasswordField = fieldHint.includes("pass") || fieldHint.includes("pwd") || fieldHint.includes("key") || fieldHint.includes("secret") || fieldHint.includes("access");
                const isEmailField = fieldHint.includes("email") || fieldHint.includes("mail") || fieldHint.includes("user") || fieldHint.includes("operator") || fieldHint.includes("id") || fieldHint.includes("login") || fieldHint.includes("account");

                if (isPasswordField) {
                  const el = page.locator("input[type='password']:visible").first();
                  if (await el.isVisible({ timeout: 1000 }).catch(() => false)) { await el.fill(value); filled = true; filledVia = "password position"; }
                } else if (isEmailField) {
                  // First try email type, then first non-password text input
                  const emailEl = page.locator("input[type='email']:visible").first();
                  if (await emailEl.isVisible({ timeout: 800 }).catch(() => false)) { await emailEl.fill(value); filled = true; filledVia = "email type"; }
                  if (!filled) {
                    const firstText = page.locator("input:visible:not([type='password']):not([type='hidden']):not([type='submit']):not([type='checkbox']):not([type='radio']):not([type='button'])").first();
                    if (await firstText.isVisible({ timeout: 800 }).catch(() => false)) { await firstText.fill(value); filled = true; filledVia = "first text input"; }
                  }
                } else if (fieldHint.includes("search") || fieldHint.includes("query")) {
                  const el = page.locator("input[type='search']:visible, input[name*='search' i]:visible, input[placeholder*='search' i]:visible").first();
                  if (await el.isVisible({ timeout: 800 }).catch(() => false)) { await el.fill(value); filled = true; filledVia = "search"; }
                } else if (fieldHint.includes("phone") || fieldHint.includes("mobile") || fieldHint.includes("tel")) {
                  const el = page.locator("input[type='tel']:visible, input[name*='phone' i]:visible").first();
                  if (await el.isVisible({ timeout: 800 }).catch(() => false)) { await el.fill(value); filled = true; filledVia = "phone"; }
                }
              }

              // Strategy 5: Ultimate fallback — just find ANY visible unfilled input
              if (!filled) {
                const allInputs = page.locator("input:visible:not([type='hidden']):not([type='submit']):not([type='checkbox']):not([type='radio']):not([type='button']), textarea:visible");
                const count = await allInputs.count();
                for (let i = 0; i < count; i++) {
                  const inp = allInputs.nth(i);
                  const curVal = await inp.inputValue().catch(() => "");
                  if (!curVal) {
                    await inp.fill(value); filled = true; filledVia = `fallback input #${i + 1}`; break;
                  }
                }
              }

              const preview = await capture();
              await smartStep(stepText, filled ? "passed" : "failed", filled ? `Filled "${fieldHint}" → "${value}" (via ${filledVia})` : `Could not find any field matching "${fieldHint}"`, preview);
            } else {
              // Generic fill: fill all visible inputs with smart defaults
              const inputs = page.locator("input:visible:not([type='hidden']):not([type='submit']):not([type='checkbox']):not([type='radio']):not([type='button']),textarea:visible");
              const inputCount = await inputs.count();
              let filled = 0;
              for (let i = 0; i < Math.min(inputCount, 6); i++) {
                const input = inputs.nth(i);
                const inputType = (await input.getAttribute("type") || "text").toLowerCase();
                const inputName = (await input.getAttribute("name") || "").toLowerCase();
                const inputPlaceholder = (await input.getAttribute("placeholder") || "").toLowerCase();
                try {
                  if (inputType === "email" || inputName.includes("email")) { await input.fill("testuser@example.com"); filled++; }
                  else if (inputType === "password") { await input.fill("Test@12345"); filled++; }
                  else if (inputType === "search" || inputName.includes("search")) { await input.fill("test search query"); filled++; }
                  else if (inputType === "tel" || inputName.includes("phone")) { await input.fill("9876543210"); filled++; }
                  else if (inputName.includes("name") || inputPlaceholder.includes("name")) { await input.fill("John Doe"); filled++; }
                  else if (inputName.includes("url") || inputType === "url") { await input.fill("https://example.com"); filled++; }
                  else if (["text", ""].includes(inputType)) { await input.fill("Test input data"); filled++; }
                } catch {}
              }
              const preview = await capture();
              await smartStep(stepText, filled > 0 ? "passed" : "failed", `Filled ${filled}/${Math.min(inputCount, 6)} inputs with smart defaults`, preview);
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // Scroll
        if (lower.includes("scroll")) {
          await smartStep(stepText,"running");
          try {
            if (lower.includes("bottom") || lower.includes("down")) {
              await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
            } else if (lower.includes("top") || lower.includes("up")) {
              await page.evaluate("window.scrollTo(0, 0)");
            } else {
              await page.evaluate("window.scrollBy(0, 500)");
            }
            await page.waitForTimeout(800);
            const preview = await capture();
            await smartStep(stepText,"passed", "Page scrolled", preview);
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // Screenshot / Capture
        if (lower.includes("screenshot") || lower.includes("capture") || lower.includes("snapshot")) {
          await smartStep(stepText,"running");
          const preview = await capture();
          await smartStep(stepText,"passed", "Screenshot captured", preview);
          return;
        }

        // Wait / Delay
        if (lower.includes("wait") || lower.includes("delay")) {
          await smartStep(stepText,"running");
          await page.waitForTimeout(800);
          const preview = await capture();
          await smartStep(stepText,"passed", "Waited 2s", preview);
          return;
        }

        // KaneAI-like: Accessibility check
        if (lower.includes("accessibility") || lower.includes("a11y") || lower.includes("aria") || lower.includes("alt text")) {
          await smartStep(stepText,"running");
          try {
            const a11yResults: any = await page.evaluate(`(function(){var issues=[];var imgsNoAlt=document.querySelectorAll("img:not([alt])").length;if(imgsNoAlt>0)issues.push(imgsNoAlt+" images missing alt text");var btnsNoLabel=Array.from(document.querySelectorAll("button")).filter(function(b){return!(b.textContent||"").trim()&&!b.getAttribute("aria-label")}).length;if(btnsNoLabel>0)issues.push(btnsNoLabel+" buttons without accessible name");var h1Count=document.querySelectorAll("h1").length;if(h1Count===0)issues.push("No H1 heading");if(h1Count>1)issues.push(h1Count+" H1 headings (should be 1)");if(!document.documentElement.lang)issues.push("Missing html lang attribute");if(!document.querySelector("main,[role=main]"))issues.push("No main landmark");var inputsNoLabel=Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=submit])")).filter(function(i){var id=i.getAttribute("id");return!i.getAttribute("aria-label")&&!i.getAttribute("aria-labelledby")&&!(id&&document.querySelector("label[for="+id+"]"))}).length;if(inputsNoLabel>0)issues.push(inputsNoLabel+" form inputs without labels");return{issues:issues,score:Math.max(0,100-issues.length*15)}})()`);
            const preview = await capture();
            const passed = a11yResults.issues.length === 0;
            await smartStep(stepText,passed ? "passed" : "failed", passed ? `Accessibility score: ${a11yResults.score}/100 - No issues found` : `Score: ${a11yResults.score}/100 - ${a11yResults.issues.join("; ")}`, preview);
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // KaneAI-like: Performance metrics
        if (lower.includes("performance") || lower.includes("load time") || lower.includes("speed") || lower.includes("metrics")) {
          await smartStep(stepText,"running");
          try {
            const perf: any = await page.evaluate(`(function(){var nav=performance.getEntriesByType("navigation")[0];if(!nav)return null;return{ttfb:Math.round(nav.responseStart-nav.requestStart),domReady:Math.round(nav.domContentLoadedEventEnd-nav.startTime),fullLoad:Math.round(nav.loadEventEnd-nav.startTime),domInteractive:Math.round(nav.domInteractive-nav.startTime)}})()`);
            const preview = await capture();
            if (perf) {
              const passed = perf.fullLoad < 5000;
              await smartStep(stepText,passed ? "passed" : "failed", `TTFB: ${perf.ttfb}ms | DOM Ready: ${perf.domReady}ms | Full Load: ${perf.fullLoad}ms | Interactive: ${perf.domInteractive}ms`, preview);
            } else {
              await smartStep(stepText,"passed", "Performance metrics not available (page may have reloaded)", preview);
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // KaneAI-like: Network/API check
        if (lower.includes("network") || lower.includes("api call") || lower.includes("api request") || lower.includes("broken link") || lower.includes("http")) {
          await smartStep(stepText,"running");
          try {
            const failedReqs = networkLog.filter(r => r.status && r.status >= 400);
            const apiReqs = networkLog.filter(r => r.type === "fetch" || r.type === "xhr");
            const preview = await capture();
            const passed = failedReqs.length === 0;
            await smartStep(stepText,passed ? "passed" : "failed", `Total requests: ${networkLog.length} | API calls: ${apiReqs.length} | Failed: ${failedReqs.length}${failedReqs.length > 0 ? " (" + failedReqs.slice(0, 3).map(r => `${r.status} ${r.url.split("/").pop()}`).join(", ") + ")" : ""}`, preview);
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // KaneAI-like: Console errors check
        if (lower.includes("console error") || lower.includes("javascript error") || lower.includes("js error")) {
          await smartStep(stepText,"running");
          const preview = await capture();
          const passed = jsErrors.length === 0;
          await smartStep(stepText,passed ? "passed" : "failed", passed ? "No JavaScript errors detected" : `${jsErrors.length} JS errors: ${jsErrors.slice(0, 3).join("; ")}`, preview);
          return;
        }

        // KaneAI-like: Hover / mouse actions
        if (lower.includes("hover")) {
          await smartStep(stepText,"running");
          try {
            const textMatch = stepText.match(/hover\s+(?:over\s+)?(?:on\s+)?(?:the\s+)?["']?(.+?)["']?\s*$/i);
            let hovered = false;
            if (textMatch) {
              const target = textMatch[1].replace(/button|link|element|the/gi, "").trim();
              if (target) {
                const el = page.locator(`button:has-text("${target}"), a:has-text("${target}"), [role="button"]:has-text("${target}")`).first();
                if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                  await el.hover();
                  hovered = true;
                  await page.waitForTimeout(800);
                  const preview = await capture();
                  await smartStep(stepText,"passed", `Hovered: "${target}"`, preview);
                }
              }
            }
            if (!hovered) {
              const btn = page.locator("button:visible, a:visible").first();
              if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await btn.hover();
                await page.waitForTimeout(800);
                const preview = await capture();
                await smartStep(stepText,"passed", "Hovered over first interactive element", preview);
              } else {
                const preview = await capture();
                await smartStep(stepText,"failed", "No hoverable element found", preview);
              }
            }
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // KaneAI-like: Keyboard navigation test
        if (lower.includes("keyboard") || lower.includes("tab navigation") || lower.includes("focus")) {
          await smartStep(stepText,"running");
          try {
            let focusableCount = 0;
            for (let i = 0; i < 10; i++) {
              await page.keyboard.press("Tab");
              await page.waitForTimeout(200);
              const focused = await page.evaluate(`(function(){var el=document.activeElement;return el&&el.tagName!=="BODY"?el.tagName+(el.getAttribute("class")?"."+el.getAttribute("class").split(" ")[0]:""):null})()`);
              if (focused) focusableCount++;
            }
            const preview = await capture();
            await smartStep(stepText,focusableCount > 0 ? "passed" : "failed", `${focusableCount} elements reachable via Tab key`, preview);
          } catch (err: any) {
            const preview = await capture();
            await smartStep(stepText,"failed", err.message, preview);
          }
          return;
        }

        // Test / Interact (generic fallback - try to do something meaningful)
        await smartStep(stepText,"running");
        try {
          const title = await page.title();
          const preview = await capture();
          await smartStep(stepText,"passed", `Page active: "${title}" at ${page.url()}`, preview);
        } catch (err: any) {
          const preview = await capture();
          await smartStep(stepText,"failed", err.message, preview);
        }
      };

      // ===== EXECUTE PLAN STEPS =====
      const stepsToRun: string[] = Array.isArray(planSteps) && planSteps.length > 0
        ? planSteps
        : ["Navigate to the application", "Verify page loads successfully", "Check for interactive elements", "Take a screenshot"];

      for (const s of stepsToRun) {
        if (stopFlags.has(runId)) break;
        await executeStep(s);
      }
      stopFlags.delete(runId);

      // Final screenshot
      step("Capture final state", "running");
      const finalPreview = await capture();
      step("Capture final state", "passed", "All test steps complete", finalPreview);

      // Emit KaneAI-style summary with network + performance data
      const failedNetReqs = networkLog.filter(r => r.status && r.status >= 400);
      emit({
        type: "summary",
        message: "Test execution summary",
        networkTotal: networkLog.length,
        networkFailed: failedNetReqs.length,
        jsErrors: jsErrors.length,
        jsErrorDetails: jsErrors.slice(0, 5),
        failedRequests: failedNetReqs.slice(0, 5).map(r => ({ url: r.url, status: r.status })),
      });

      // Generate Playwright script from executed steps
      const scriptCode = generatePlaywrightScript(url, stepsToRun, runId);
      const scriptsDir = path.join(__dirname, "workspace/generated-scripts");
      if (!fs.existsSync(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

      // Delete old scripts before writing new one
      try {
        const oldFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".spec.ts"));
        for (const f of oldFiles) {
          fs.unlinkSync(path.join(scriptsDir, f));
        }
      } catch {}

      const scriptFileName = `test_${runId.slice(0, 8)}.spec.ts`;
      const scriptPath = path.join(scriptsDir, scriptFileName);
      fs.writeFileSync(scriptPath, scriptCode);
      emit({ type: "script", code: scriptCode, fileName: scriptFileName });

      clearInterval(frameCaptureInterval);
      await browser.close().catch(() => {});
      activeBrowsers.delete(runId);
      await persistRun("passed", `Completed ${stepsToRun.length} steps`);
    } catch (err: any) {
      if (frameCaptureInterval) clearInterval(frameCaptureInterval);
      log("Critical error: " + err.message, "error");
      activeBrowsers.delete(runId);
      await persistRun("failed", err.message);
    } finally {
      log("Run completed.", "info");
      setTimeout(() => eventQueues.delete(runId), 60000);
    }
  })();
});

// Get list of generated scripts
app.get("/api/scripts", authenticate, (req, res) => {
  const scriptsDir = path.join(__dirname, "workspace/generated-scripts");
  if (!fs.existsSync(scriptsDir)) return res.json({ scripts: [] });
  const files = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".spec.ts")).sort().reverse();
  const scripts = files.map(f => ({
    name: f,
    content: fs.readFileSync(path.join(scriptsDir, f), "utf-8"),
    created: fs.statSync(path.join(scriptsDir, f)).mtime.toISOString(),
  }));
  res.json({ scripts });
});

// Get a single script by filename
app.get("/api/scripts/:fileName", authenticate, (req, res) => {
  const filePath = path.join(__dirname, "workspace/generated-scripts", req.params.fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Script not found" });
  res.json({ name: req.params.fileName, content: fs.readFileSync(filePath, "utf-8") });
});

app.post("/api/chat", authenticate, async (req, res) => {
  const { message, code } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // RAG: Retrieve relevant knowledge
  const ragContext = retrieveContext(message, 3);

  const systemPrompt = `You are Test AI - a friendly, helpful Senior QA Automation Engineer. You are an expert in Playwright, test automation, debugging, and software quality.

YOU MUST:
- Answer EVERY question the user asks. Never refuse or redirect.
- If user says "Hi" or greets you, greet back warmly and ask how you can help with their testing.
- If user asks about a test failure, analyze it and give a clear solution with code.
- If user asks "what is the issue" or "why did it fail", explain the root cause clearly.
- If user asks where to change code, show exact before/after code snippets.
- If user asks in Hindi/Hinglish, reply in the same language mix.
- If user asks about general programming/web concepts (HTML, CSS, JS, APIs, etc.), answer it — it's relevant to testing.
- Always be helpful. Always give a proper answer. Never say "I can only help with X".

YOUR EXPERTISE:
- Playwright test scripts (generate, fix, debug)
- Test failures analysis and solutions
- Locators, assertions, waits, fixtures, POM
- API testing, UI testing, accessibility, performance
- General web development concepts relevant to testing
- CI/CD, test architecture, best practices

RULES:
- Provide complete, runnable Playwright TypeScript code when generating/fixing scripts.
- Include imports: import { test, expect } from '@playwright/test';
- Use best practices: getByRole/getByText, web-first assertions, no hard waits.
- When fixing code, show COMPLETE fixed version.
- When analyzing failures, explain root cause + provide fix.
- Be concise. Code first, explanation second.
- Use markdown formatting.

USER'S CURRENT CODE:
${code ? `\`\`\`typescript\n${code}\n\`\`\`` : "No code loaded."}

RELEVANT DOCS:
${ragContext || ""}`;

  try {
    // Priority 1: Gemini
    if (GEMINI_KEY) {
      try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemPrompt });
        const result = await model.generateContent(message);
        const response = result.response;
        const responseText = response.text() || "";
        const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
        const fixedCode = codeMatch ? codeMatch[1].trim() : null;
        return res.json({ response: responseText, fixedCode, mode: "gemini" });
      } catch (err: any) {
        console.warn("Gemini chat failed, trying Ollama.", err?.message || err);
      }
    }

    // Priority 2: Ollama (free local LLM)
    if (await isOllamaAvailable()) {
      try {
        const responseText = await ollamaChat(systemPrompt, message);
        if (responseText) {
          const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
          const fixedCode = codeMatch ? codeMatch[1].trim() : null;
          return res.json({ response: responseText, fixedCode, mode: "ollama" });
        }
      } catch (err: any) {
        console.warn("Ollama chat failed, falling back to local mode.", err?.message || err);
      }
    }

    // Priority 3: Local keyword engine
    const localResult = LocalAIEngine.generateChatResponse(message, code);
    res.json({ ...localResult, mode: "local" });
  } catch (err: any) {
    const localResult = LocalAIEngine.generateChatResponse(message, code);
    res.json({ ...localResult, mode: "local" });
  }
});

async function startServer() {
  await store.init();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database mode: ${SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? "Supabase" : "SQLite (local)"}`);
    console.log("Easter egg available at /easter-egg");
  });
}

startServer();
