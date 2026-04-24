import type { Request, Response, NextFunction, RequestHandler } from "express";
import fs from "fs";
import path from "path";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}
export const badRequest = (msg: string) => new ApiError(400, msg, "BAD_REQUEST");
export const unauthorized = (msg = "Unauthorized") => new ApiError(401, msg, "UNAUTHORIZED");
export const notFound = (msg = "Not found") => new ApiError(404, msg, "NOT_FOUND");
export const tooMany = (msg = "Too many requests") => new ApiError(429, msg, "RATE_LIMITED");

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => any): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error("[server-error]", err?.stack || err);
  const status = typeof err?.status === "number" ? err.status : 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err?.message || "Internal server error";
  res.status(status).json({ error: message, code: err?.code || "INTERNAL" });
}

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

setInterval(() => {
  const now = Date.now();
  rateBuckets.forEach((v, k) => { if (v.resetAt < now) rateBuckets.delete(k); });
}, 60_000).unref?.();

export function rateLimit(opts: { limit?: number; windowMs?: number; key?: string; skipPaths?: string[] } = {}): RequestHandler {
  const { limit = 300, windowMs = 60_000, key: keyPrefix = "global", skipPaths = [] } = opts;
  return (req, res, next) => {
    if (skipPaths.some((p) => req.path.startsWith(p))) return next();
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "local";
    const bucketKey = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(bucketKey);

    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(limit - 1));
      return next();
    }
    if (bucket.count >= limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", "0");
      return res.status(429).json({ error: `Rate limit exceeded. Try again in ${retryAfter}s`, code: "RATE_LIMITED" });
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(limit - bucket.count));
    next();
  };
}

type Rule = {
  type?: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
};

export function validate<T extends Record<string, any>>(body: any, schema: Record<string, Rule>): T {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object");
  }
  const out: any = {};
  for (const [key, rule] of Object.entries(schema)) {
    const v = body[key];
    if (v === undefined || v === null || v === "") {
      if (rule.required) throw badRequest(`Missing required field: ${key}`);
      continue;
    }
    if (rule.type === "string") {
      if (typeof v !== "string") throw badRequest(`${key} must be a string`);
      if (rule.min != null && v.length < rule.min) throw badRequest(`${key} must be at least ${rule.min} chars`);
      if (rule.max != null && v.length > rule.max) throw badRequest(`${key} must be at most ${rule.max} chars`);
      if (rule.pattern && !rule.pattern.test(v)) throw badRequest(`${key} has invalid format`);
      if (rule.enum && !rule.enum.includes(v)) throw badRequest(`${key} must be one of: ${rule.enum.join(", ")}`);
    } else if (rule.type === "number") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) throw badRequest(`${key} must be a number`);
      if (rule.min != null && n < rule.min) throw badRequest(`${key} must be >= ${rule.min}`);
      if (rule.max != null && n > rule.max) throw badRequest(`${key} must be <= ${rule.max}`);
      out[key] = n;
      continue;
    } else if (rule.type === "boolean") {
      if (typeof v !== "boolean") throw badRequest(`${key} must be a boolean`);
    } else if (rule.type === "array") {
      if (!Array.isArray(v)) throw badRequest(`${key} must be an array`);
    } else if (rule.type === "object") {
      if (typeof v !== "object" || Array.isArray(v)) throw badRequest(`${key} must be an object`);
    }
    out[key] = v;
  }
  return out as T;
}

type CacheEntry<T> = { value: T; expiresAt: number };
const cacheStore = new Map<string, CacheEntry<any>>();

setInterval(() => {
  const now = Date.now();
  cacheStore.forEach((v, k) => { if (v.expiresAt < now) cacheStore.delete(k); });
}, 60_000).unref?.();

export const cache = {
  get<T>(key: string): T | undefined {
    const e = cacheStore.get(key);
    if (!e) return;
    if (e.expiresAt < Date.now()) { cacheStore.delete(key); return; }
    return e.value as T;
  },
  set<T>(key: string, value: T, ttlMs: number) {
    cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
  delete(k: string) { cacheStore.delete(k); },
  deletePrefix(p: string) {
    const ks: string[] = [];
    cacheStore.forEach((_, k) => { if (k.startsWith(p)) ks.push(k); });
    ks.forEach((k) => cacheStore.delete(k));
  },
  async wrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  },
  stats() { return { size: cacheStore.size }; },
};

export function cacheMiddleware(ttlMs: number, keyFn: (req: Request) => string = (r) => `${r.method}:${r.originalUrl}`): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "GET") return next();
    const key = `http:${keyFn(req)}`;
    const hit = cache.get<{ status: number; body: any }>(key);
    if (hit) {
      res.setHeader("X-Cache", "HIT");
      return res.status(hit.status).json(hit.body);
    }
    const origJson = res.json.bind(res);
    (res as any).json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, { status: res.statusCode, body }, ttlMs);
      }
      res.setHeader("X-Cache", "MISS");
      return origJson(body);
    };
    next();
  };
}

export const TEST_TEMPLATES = {
  e2e: (baseUrl: string) => `import { test, expect } from '@playwright/test';

test.describe('End to End', () => {
  test('homepage loads and core elements are present', async ({ page }) => {
    await page.goto('${baseUrl}');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/.+/);
    const buttons = page.getByRole('button');
    expect(await buttons.count()).toBeGreaterThan(0);
  });
});`,

  accessibility: (baseUrl: string) => `import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('page meets basic a11y requirements', async ({ page }) => {
    await page.goto('${baseUrl}');
    await page.waitForLoadState('networkidle');

    // 1. html has lang
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang, '<html lang> must be set').toBeTruthy();

    // 2. All images have alt text
    const imgs = page.locator('img');
    const imgCount = await imgs.count();
    for (let i = 0; i < imgCount; i++) {
      const alt = await imgs.nth(i).getAttribute('alt');
      const role = await imgs.nth(i).getAttribute('role');
      expect(alt !== null || role === 'presentation', \`Image \${i} missing alt\`).toBeTruthy();
    }

    // 3. Form inputs have associated labels
    const inputs = page.locator('input:not([type="hidden"]), select, textarea');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      const id = await el.getAttribute('id');
      const ariaLabel = await el.getAttribute('aria-label');
      const ariaLabelled = await el.getAttribute('aria-labelledby');
      const hasLabel = id ? (await page.locator(\`label[for="\${id}"]\`).count()) > 0 : false;
      expect(hasLabel || ariaLabel || ariaLabelled, \`Input \${i} missing label\`).toBeTruthy();
    }

    // 4. Keyboard focus advances
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();
  });
});`,

  performance: (baseUrl: string) => `import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('page loads within budget', async ({ page }) => {
    const start = Date.now();
    const response = await page.goto('${baseUrl}');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(response?.ok(), 'Page should respond 2xx').toBeTruthy();
    expect(loadTime, 'Total load < 5s').toBeLessThan(5000);

    const timings = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const paints = performance.getEntriesByType('paint') as PerformanceEntry[];
      const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime ?? null;
      return {
        ttfb: nav ? nav.responseStart - nav.startTime : null,
        firstContentfulPaint: fcp,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      };
    });
    if (timings.ttfb != null) expect(timings.ttfb, 'TTFB < 1500ms').toBeLessThan(1500);
    if (timings.firstContentfulPaint != null) {
      expect(timings.firstContentfulPaint, 'FCP < 3000ms').toBeLessThan(3000);
    }

    const totalBytes = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries.reduce((s, e) => s + (e.transferSize || 0), 0);
    });
    expect(totalBytes, 'Total transfer < 5MB').toBeLessThan(5 * 1024 * 1024);
  });
});`,
} as const;

export type TestTemplateType = keyof typeof TEST_TEMPLATES;

export function detectTestType(instructions: string): TestTemplateType {
  const s = instructions.toLowerCase();
  if (/\b(a11y|accessib|wcag|screen reader|aria|alt text)\b/.test(s)) return "accessibility";
  if (/\b(performance|perf|load time|lighthouse|fcp|ttfb|speed|latency)\b/.test(s)) return "performance";
  return "e2e";
}

const FEEDBACK_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, "feedback.json");

export type FeedbackRecord = {
  id: string;
  category: "bug" | "idea" | "question" | "other";
  message: string;
  email?: string;
  page?: string;
  userAgent?: string;
  createdAt: string;
};

export function readFeedback(): FeedbackRecord[] {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function appendFeedback(record: FeedbackRecord) {
  if (!fs.existsSync(FEEDBACK_DIR)) fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  const items = readFeedback();
  items.unshift(record);
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items.slice(0, 1000), null, 2));
}

export const API_DOCS = {
  info: {
    title: "Test AI Platform API",
    version: "1.1.0",
    description: "AI-powered test generation and execution. Rate limits are per-IP.",
  },
  baseUrl: "/api",
  endpoints: [
    { method: "GET", path: "/health", auth: false, rateLimit: "global", summary: "Liveness probe" },
    { method: "GET", path: "/ai-status", auth: true, cache: "10s", summary: "Current AI provider (gemini/ollama/local)" },
    { method: "POST", path: "/auth/login", auth: false, rateLimit: "10/min", summary: "Get a JWT for subsequent calls" },
    { method: "POST", path: "/settings/ai-key", auth: true, rateLimit: "10/min", summary: "Save and validate a Gemini API key" },
    { method: "GET", path: "/test-history", auth: true, summary: "Last 50 test history entries" },
    { method: "POST", path: "/test-history", auth: true, summary: "Append a test history record" },
    { method: "POST", path: "/generate-ui-test", auth: true, summary: "AI generate a Playwright UI test" },
    { method: "POST", path: "/ui-plan", auth: true, summary: "Generate a test plan from URL + objective" },
    { method: "POST", path: "/run-tests", auth: true, summary: "Run a generated Playwright test" },
    { method: "POST", path: "/stop-test/:runId", auth: true, summary: "Abort an in-progress test run" },
    { method: "GET", path: "/events/:runId", auth: false, summary: "SSE stream of run events" },
    { method: "POST", path: "/parse-collection", auth: true, summary: "Parse a Postman collection" },
    { method: "POST", path: "/parse-curl", auth: true, summary: "Parse a cURL command into request details" },
    { method: "POST", path: "/run-api-test", auth: true, summary: "Run a single API test" },
    { method: "POST", path: "/run-api-agents", auth: true, summary: "Multi-agent API test run" },
    { method: "POST", path: "/import-postman", auth: true, summary: "Import tests from a Postman collection" },
    { method: "GET", path: "/scripts", auth: true, cache: "30s", summary: "List generated scripts" },
    { method: "GET", path: "/scripts/:fileName", auth: true, summary: "Get a generated script file" },
    { method: "POST", path: "/chat", auth: true, summary: "AI assistant chat" },
    { method: "GET", path: "/test-templates", auth: false, rateLimit: "60/min", summary: "List available test templates (e2e, accessibility, performance)" },
    { method: "GET", path: "/test-templates/:type", auth: false, rateLimit: "60/min", summary: "Get a specific test template. Query: ?baseUrl=" },
    { method: "POST", path: "/feedback", auth: false, rateLimit: "10/min", summary: "Submit user feedback. Body: { category, message, email?, page? }" },
    { method: "GET", path: "/feedback", auth: true, summary: "List feedback (admin)" },
    { method: "GET", path: "/docs", auth: false, summary: "This documentation" },
    { method: "GET", path: "/cache-stats", auth: true, summary: "Inspect in-memory cache size" },
  ],
  errors: {
    "400": { code: "BAD_REQUEST", description: "Invalid input" },
    "401": { code: "UNAUTHORIZED", description: "Missing/invalid auth" },
    "404": { code: "NOT_FOUND", description: "Resource not found" },
    "429": { code: "RATE_LIMITED", description: "Too many requests. Check X-RateLimit-* and Retry-After headers." },
    "500": { code: "INTERNAL", description: "Server error" },
  },
  examples: {
    login: `curl -X POST http://localhost:3100/api/auth/login -H "Content-Type: application/json" -d '{"email":"you@example.com"}'`,
    generateAccessibilityTemplate: `curl "http://localhost:3100/api/test-templates/accessibility?baseUrl=https://example.com"`,
    submitFeedback: `curl -X POST http://localhost:3100/api/feedback -H "Content-Type: application/json" -d '{"category":"idea","message":"Add dark mode to reports"}'`,
  },
} as const;
