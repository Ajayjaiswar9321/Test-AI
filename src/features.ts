import express, { type Express, type RequestHandler } from "express";
import type Database from "better-sqlite3";
import { chromium, firefox, webkit } from "playwright";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  asyncHandler,
  rateLimit,
  validate,
  badRequest,
  notFound,
  cache,
} from "./server-helpers.js";

const JWT_SECRET = process.env.JWT_SECRET || "bro-testing-secret-key-123";

// ---------- DB schema for feature tables ----------
export function ensureFeatureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (team_id, email)
    );
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      email TEXT,
      linked_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_user_id)
    );
    CREATE TABLE IF NOT EXISTS scheduled_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      test_config TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      owner_email TEXT,
      browser TEXT DEFAULT 'chromium',
      last_run_at DATETIME,
      next_run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS run_history (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      browser TEXT,
      status TEXT,
      duration_ms INTEGER,
      summary TEXT,
      owner_email TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_run_history_test ON run_history(test_id);
    CREATE INDEX IF NOT EXISTS idx_run_history_created ON run_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_scheduled_enabled ON scheduled_tests(enabled);
  `);
}

// ---------- Browser/Device matrix ----------
export const SUPPORTED_BROWSERS = ["chromium", "firefox", "webkit"] as const;
export type SupportedBrowser = (typeof SUPPORTED_BROWSERS)[number];

export const DEVICE_PRESETS = {
  "desktop-1080p": { viewport: { width: 1920, height: 1080 }, isMobile: false },
  "desktop-720p": { viewport: { width: 1280, height: 720 }, isMobile: false },
  "tablet-ipad": { viewport: { width: 768, height: 1024 }, isMobile: true },
  "mobile-iphone": { viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 3 },
  "mobile-pixel": { viewport: { width: 412, height: 915 }, isMobile: true, deviceScaleFactor: 2.6 },
} as const;
export type DevicePreset = keyof typeof DEVICE_PRESETS;

export async function launchBrowser(name: SupportedBrowser) {
  if (name === "firefox") return firefox.launch({ headless: true });
  if (name === "webkit") return webkit.launch({ headless: true });
  return chromium.launch({ headless: true });
}

// ---------- Cron parser (minimal: supports "* * * * *" fields) ----------
function matchCronField(field: string, value: number): boolean {
  if (field === "*") return true;
  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      if (!step || Number.isNaN(step)) continue;
      if (range === "*") { if (value % step === 0) return true; continue; }
      const [a, b] = range.split("-").map((n) => parseInt(n, 10));
      if (Number.isNaN(a)) continue;
      const end = Number.isNaN(b) ? a : b;
      for (let v = a; v <= end; v += step) if (v === value) return true;
    } else if (part.includes("-")) {
      const [a, b] = part.split("-").map((n) => parseInt(n, 10));
      if (value >= a && value <= b) return true;
    } else {
      if (parseInt(part, 10) === value) return true;
    }
  }
  return false;
}

export function cronMatches(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, dom, mon, dow] = parts;
  return (
    matchCronField(m, date.getMinutes()) &&
    matchCronField(h, date.getHours()) &&
    matchCronField(dom, date.getDate()) &&
    matchCronField(mon, date.getMonth() + 1) &&
    matchCronField(dow, date.getDay())
  );
}

export function validateCronExpr(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^[0-9*,\-/]+$/.test(p));
}

// ---------- CI/CD config generators ----------
export function renderCICDConfig(provider: string, opts: { testCommand?: string; nodeVersion?: string } = {}): { filename: string; content: string } {
  const testCmd = opts.testCommand || "npx playwright test";
  const nodeVersion = opts.nodeVersion || "20";
  switch (provider) {
    case "github":
      return {
        filename: ".github/workflows/playwright.yml",
        content: `name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "${nodeVersion}"
          cache: "npm"
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: ${testCmd}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
`,
      };
    case "circleci":
      return {
        filename: ".circleci/config.yml",
        content: `version: 2.1
jobs:
  test:
    docker:
      - image: mcr.microsoft.com/playwright:v1.58.2-jammy
    steps:
      - checkout
      - restore_cache:
          keys:
            - deps-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          key: deps-{{ checksum "package-lock.json" }}
          paths: [node_modules]
      - run: ${testCmd}
      - store_artifacts:
          path: playwright-report
workflows:
  version: 2
  build:
    jobs:
      - test
`,
      };
    case "jenkins":
      return {
        filename: "Jenkinsfile",
        content: `pipeline {
  agent {
    docker { image 'mcr.microsoft.com/playwright:v1.58.2-jammy' }
  }
  options { timeout(time: 30, unit: 'MINUTES') }
  stages {
    stage('Install') { steps { sh 'npm ci' } }
    stage('Test') {
      steps { sh '${testCmd}' }
      post {
        always {
          archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
        }
      }
    }
  }
}
`,
      };
    case "gitlab":
      return {
        filename: ".gitlab-ci.yml",
        content: `image: mcr.microsoft.com/playwright:v1.58.2-jammy

stages: [test]

test:
  stage: test
  cache:
    paths: [node_modules/]
  script:
    - npm ci
    - ${testCmd}
  artifacts:
    when: always
    paths: [playwright-report/]
    expire_in: 14 days
`,
      };
    default:
      throw badRequest(`Unknown provider: ${provider}. Supported: github, circleci, jenkins, gitlab`);
  }
}

// ---------- Scheduler background loop ----------
const runningSchedules = new Set<string>();

export function startScheduler(db: Database.Database, triggerFn: (row: any) => Promise<void>) {
  async function tick() {
    try {
      const now = new Date();
      const rows = db
        .prepare("SELECT * FROM scheduled_tests WHERE enabled = 1")
        .all() as any[];
      for (const row of rows) {
        if (!cronMatches(row.cron_expr, now)) continue;
        // dedupe: don't fire twice in same minute
        const key = `${row.id}:${now.toISOString().slice(0, 16)}`;
        if (runningSchedules.has(key)) continue;
        runningSchedules.add(key);
        setTimeout(() => runningSchedules.delete(key), 90_000);
        triggerFn(row).catch((e) => console.warn("[scheduler] trigger failed:", e?.message));
        db.prepare("UPDATE scheduled_tests SET last_run_at = CURRENT_TIMESTAMP WHERE id = ?").run(row.id);
      }
    } catch (err) {
      console.warn("[scheduler] tick error:", err);
    }
  }
  const interval = setInterval(tick, 30_000);
  interval.unref?.();
  // Fire once on startup to cover missed ticks
  setTimeout(tick, 5_000).unref?.();
  return interval;
}

// ---------- Parallel runner pool ----------
const MAX_PARALLEL = parseInt(process.env.MAX_PARALLEL_TESTS || "4", 10);
const activeParallelRuns = new Map<string, { total: number; completed: number; failed: number; startedAt: number; results: any[] }>();

export async function runInParallel(
  suiteId: string,
  items: Array<{ id: string; run: () => Promise<any> }>,
  concurrency = MAX_PARALLEL
) {
  const state = { total: items.length, completed: 0, failed: 0, startedAt: Date.now(), results: [] as any[] };
  activeParallelRuns.set(suiteId, state);

  const queue = [...items];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      try {
        const result = await item.run();
        state.results.push({ id: item.id, ok: true, result });
      } catch (err: any) {
        state.failed += 1;
        state.results.push({ id: item.id, ok: false, error: err?.message || String(err) });
      } finally {
        state.completed += 1;
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return state;
}

export function getParallelRunStatus(suiteId: string) {
  return activeParallelRuns.get(suiteId) || null;
}

// ---------- Registration ----------
export interface FeatureDeps {
  db: Database.Database;
  authenticate: RequestHandler;
  getOrCreateUser: (email: string) => Promise<{ id: number; email: string }>;
}

export function registerFeatures(app: Express, deps: FeatureDeps) {
  const { db, authenticate, getOrCreateUser } = deps;
  ensureFeatureTables(db);

  // =========================================================
  // 1. OAuth / Social login
  // =========================================================
  const OAUTH_PROVIDERS: Record<string, { clientId?: string; authUrl: string; tokenUrl: string; userUrl: string; scope: string }> = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
      scope: "openid email profile",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userUrl: "https://api.github.com/user",
      scope: "read:user user:email",
    },
  };

  app.get("/api/auth/oauth/providers", (_req, res) => {
    const enabled: string[] = [];
    for (const [name, cfg] of Object.entries(OAUTH_PROVIDERS)) {
      if (cfg.clientId) enabled.push(name);
    }
    res.json({ enabled, all: Object.keys(OAUTH_PROVIDERS) });
  });

  app.get("/api/auth/oauth/:provider/start", asyncHandler((req, res) => {
    const { provider } = req.params;
    const cfg = OAUTH_PROVIDERS[provider];
    if (!cfg) throw badRequest(`Unknown provider: ${provider}`);
    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/${provider}/callback`;
    cache.set(`oauth_state:${state}`, { provider, redirectUri }, 10 * 60_000);

    // Real OAuth path
    if (cfg.clientId) {
      const url = new URL(cfg.authUrl);
      url.searchParams.set("client_id", cfg.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", cfg.scope);
      url.searchParams.set("state", state);
      return res.json({ url: url.toString(), state, mode: "live" });
    }

    // Fallback: local mock sign-in that mirrors the real OAuth UX
    const mockUrl = `/mock-oauth/${provider}?state=${state}`;
    res.json({ url: mockUrl, state, mode: "mock" });
  }));

  // ---------------- Mock OAuth sign-in pages ----------------
  const renderMockGoogle = (state: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in – Test AI (demo)</title>
<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Roboto', 'Segoe UI', system-ui, sans-serif; background: #202124; color: #e8eaed; min-height: 100vh; }
  .wrap { max-width: 450px; margin: 48px auto; background: #202124; border: 1px solid #3c4043; border-radius: 8px; padding: 48px 40px 36px; }
  .badge { display:inline-block; font-size: 10px; color: #9aa0a6; background:#303134; padding: 2px 8px; border-radius: 999px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 18px; }
  .logo { width: 75px; height: 24px; margin-bottom: 20px; }
  h1 { font-size: 24px; font-weight: 400; margin: 0 0 8px; color: #e8eaed; }
  p { color: #bdc1c6; font-size: 14px; margin: 0 0 24px; }
  label { display:block; font-size: 12px; color: #9aa0a6; margin-bottom: 6px; }
  input { width: 100%; padding: 13px 14px; background: transparent; border: 1px solid #5f6368; border-radius: 4px; font-size: 16px; color: #e8eaed; outline: none; transition: border .2s; }
  input:focus { border-color: #8ab4f8; border-width: 2px; padding: 12px 13px; }
  .row { display:flex; justify-content: space-between; align-items:center; margin-top: 40px; }
  .link { color: #8ab4f8; font-size: 14px; font-weight: 500; text-decoration: none; padding: 8px 12px; border-radius: 4px; }
  .link:hover { background: rgba(138,180,248,.08); }
  button.next { background: #8ab4f8; color: #202124; border: 0; padding: 10px 24px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; letter-spacing: .25px; }
  button.next:hover { background: #aecbfa; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
  button.next:disabled { background: #3c4043; color: #5f6368; cursor: not-allowed; }
  .footer { display:flex; justify-content: space-between; color: #9aa0a6; font-size: 12px; margin-top: 40px; padding: 0 4px; }
  .footer a { color: #9aa0a6; text-decoration: none; margin-left: 16px; }
  .footer a:hover { color: #e8eaed; }
  .error { color:#f28b82; font-size: 13px; margin-top: 8px; }
</style></head>
<body>
  <div class="wrap">
    <span class="badge">Demo · Local mock</span>
    <svg class="logo" viewBox="0 0 75 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#4285F4" d="M6.5 12.33c0-.62-.05-1.22-.14-1.8H.16v3.41h3.56c-.15.83-.62 1.53-1.32 2v1.67h2.14c1.25-1.15 1.96-2.85 1.96-5.28z"/></svg>
    <h1>Sign in</h1>
    <p>to continue to Test AI</p>
    <form method="POST" action="/mock-oauth/google/complete">
      <input type="hidden" name="state" value="${state}">
      <label for="email">Email or phone</label>
      <input id="email" name="email" type="email" autocomplete="email" required placeholder="you@example.com" autofocus>
      <div class="row">
        <a href="/" class="link">Cancel</a>
        <button class="next" type="submit">Next</button>
      </div>
    </form>
    <div class="footer">
      <span>English (United States)</span>
      <div><a href="#">Help</a><a href="#">Privacy</a><a href="#">Terms</a></div>
    </div>
  </div>
</body></html>`;

  const renderMockGithub = (state: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in – Test AI (demo)</title>
<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #0d1117; color: #c9d1d9; min-height: 100vh; }
  header { text-align:center; padding: 24px 0 0; }
  .mark { width: 48px; height: 48px; fill: #c9d1d9; }
  .badge { display:inline-block; font-size: 10px; color: #8b949e; background:#161b22; border: 1px solid #30363d; padding: 2px 10px; border-radius: 999px; letter-spacing: .08em; text-transform: uppercase; margin: 20px 0 0; }
  h1 { font-size: 24px; font-weight: 300; text-align:center; margin: 18px 0 24px; }
  .card { max-width: 308px; margin: 0 auto; background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; }
  label { display:block; font-size: 14px; font-weight: 600; margin-bottom: 6px; color: #c9d1d9; }
  input { width: 100%; padding: 5px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; font-size: 14px; color: #c9d1d9; outline: none; height: 32px; }
  input:focus { border-color: #388bfd; box-shadow: 0 0 0 3px rgba(56,139,253,.15); }
  button { width: 100%; margin-top: 16px; padding: 5px 16px; background: #238636; color: #fff; border: 1px solid rgba(240,246,252,.1); border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; height: 32px; }
  button:hover { background: #2ea043; }
  .alt { max-width: 308px; margin: 16px auto 0; background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; text-align: center; font-size: 14px; color: #c9d1d9; }
  .alt a { color: #58a6ff; text-decoration: none; }
  .alt a:hover { text-decoration: underline; }
  .footer { max-width: 340px; margin: 48px auto 24px; padding: 16px 0; border-top: 1px solid #21262d; text-align:center; color: #8b949e; font-size: 12px; }
  .footer a { color: #58a6ff; text-decoration: none; margin: 0 8px; }
</style></head>
<body>
  <header>
    <svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
    <div><span class="badge">Demo · Local mock</span></div>
  </header>
  <h1>Sign in to Test AI</h1>
  <form class="card" method="POST" action="/mock-oauth/github/complete">
    <input type="hidden" name="state" value="${state}">
    <label for="email">Username or email address</label>
    <input id="email" name="email" type="email" autocomplete="email" required autofocus>
    <button type="submit">Sign in</button>
  </form>
  <div class="alt">New to Test AI? <a href="#">Create an account</a></div>
  <footer class="footer">
    <a href="/">Cancel</a>
    <a href="#">Terms</a><a href="#">Privacy</a><a href="#">Docs</a>
  </footer>
</body></html>`;

  app.use("/mock-oauth", express.urlencoded({ extended: true }));

  app.get("/mock-oauth/:provider", (req, res) => {
    const { provider } = req.params;
    const state = String(req.query.state || "");
    if (!state || !cache.get(`oauth_state:${state}`)) {
      return res.status(400).send("Session expired. Please go back and try again.");
    }
    if (provider === "google") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderMockGoogle(state));
    }
    if (provider === "github") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(renderMockGithub(state));
    }
    return res.status(400).send("Unknown provider");
  });

  app.post("/mock-oauth/:provider/complete", asyncHandler(async (req: any, res) => {
    const { provider } = req.params;
    const { email, state } = req.body || {};
    const stored = cache.get<{ provider: string; redirectUri: string }>(`oauth_state:${state}`);
    if (!stored || stored.provider !== provider) {
      return res.status(400).send("Session expired. <a href='/'>Go back</a>");
    }
    const normalized = typeof email === "string" && email.includes("@")
      ? email.trim().toLowerCase()
      : `${provider}-user-${Date.now()}@testai.demo`;

    const user = await getOrCreateUser(normalized);
    try {
      db.prepare(`
        INSERT OR IGNORE INTO oauth_accounts (id, provider, provider_user_id, email, linked_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(`oa_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`, `mock_${provider}`, String(user.id), normalized, user.id);
    } catch {}

    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    cache.delete(`oauth_state:${state}`);
    res.redirect(`/?token=${encodeURIComponent(jwtToken)}&oauth=${provider}`);
  }));

  app.get("/api/auth/oauth/:provider/callback", asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const { code, state } = req.query;
    const cfg = OAUTH_PROVIDERS[provider];
    if (!cfg) throw badRequest(`Unknown provider: ${provider}`);
    if (!code || !state) throw badRequest("Missing code or state");
    const stored = cache.get<{ provider: string; redirectUri: string }>(`oauth_state:${state}`);
    if (!stored || stored.provider !== provider) throw badRequest("Invalid or expired state");
    const secret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    if (!cfg.clientId || !secret) {
      return res.status(503).json({ error: "OAuth not configured" });
    }

    // 1. Exchange auth code for access token
    const tokenBody = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: secret,
      code: String(code),
      redirect_uri: stored.redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: tokenBody.toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      console.warn(`[oauth:${provider}] token exchange failed:`, tokenRes.status, errText);
      return res.redirect(`/?oauth_error=token_exchange_failed&provider=${provider}`);
    }
    const tokenJson: any = await tokenRes.json();
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return res.redirect(`/?oauth_error=no_access_token&provider=${provider}`);
    }

    // 2. Fetch user profile
    const userRes = await fetch(cfg.userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "test-ai-platform",
        Accept: "application/json",
      },
    });
    if (!userRes.ok) {
      return res.redirect(`/?oauth_error=userinfo_failed&provider=${provider}`);
    }
    const userInfo: any = await userRes.json();

    // 3. Resolve email (GitHub sometimes hides it on the primary endpoint)
    let email: string | null = userInfo.email || userInfo.verified_email || null;
    if (!email && provider === "github") {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "test-ai-platform", Accept: "application/json" },
        });
        if (emailsRes.ok) {
          const emails: any[] = await emailsRes.json();
          const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
          email = primary?.email || null;
        }
      } catch {}
    }
    if (!email) {
      const providerUserId = userInfo.id || userInfo.sub;
      email = `${provider}-${providerUserId}@users.oauth`;
    }

    // 4. Create/find user, record OAuth link, issue JWT
    const user = await getOrCreateUser(email);
    const providerUserId = String(userInfo.id || userInfo.sub || "");
    try {
      db.prepare(`
        INSERT OR IGNORE INTO oauth_accounts (id, provider, provider_user_id, email, linked_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(`oa_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`, provider, providerUserId, email, user.id);
    } catch (err) {
      console.warn(`[oauth:${provider}] failed to record oauth_accounts link:`, err);
    }

    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    cache.delete(`oauth_state:${state}`);

    // 5. Redirect back to frontend with the token in URL fragment
    res.redirect(`/?token=${encodeURIComponent(jwtToken)}&oauth=${provider}`);
  }));

  // =========================================================
  // 2. Team Collaboration
  // =========================================================
  const ROLES = ["owner", "admin", "member", "viewer"] as const;

  app.post("/api/teams", authenticate, rateLimit({ limit: 30, windowMs: 60_000, key: "teams:create" }), asyncHandler(async (req: any, res) => {
    const input = validate<{ name: string }>(req.body, {
      name: { type: "string", required: true, min: 1, max: 100 },
    });
    const id = `team_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    db.prepare("INSERT INTO teams (id, name) VALUES (?, ?)").run(id, input.name.trim());
    db.prepare("INSERT INTO team_members (team_id, email, role) VALUES (?, ?, ?)")
      .run(id, req.user.email, "owner");
    res.status(201).json({ id, name: input.name.trim(), ownerEmail: req.user.email });
  }));

  app.get("/api/teams", authenticate, asyncHandler(async (req: any, res) => {
    const rows = db
      .prepare(`
        SELECT t.id, t.name, t.created_at, tm.role
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id
        WHERE tm.email = ?
        ORDER BY t.created_at DESC
      `)
      .all(req.user.email);
    res.json({ teams: rows });
  }));

  app.get("/api/teams/:id/members", authenticate, asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const member = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND email = ?").get(id, req.user.email);
    if (!member) throw notFound("Team not found or access denied");
    const members = db.prepare("SELECT email, role, added_at FROM team_members WHERE team_id = ? ORDER BY added_at ASC").all(id);
    res.json({ members });
  }));

  app.post("/api/teams/:id/members", authenticate, asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const me = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND email = ?").get(id, req.user.email) as any;
    if (!me) throw notFound("Team not found or access denied");
    if (!["owner", "admin"].includes(me.role)) throw badRequest("Only owner/admin can add members");
    const input = validate<{ email: string; role: string }>(req.body, {
      email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      role: { type: "string", enum: ROLES },
    });
    try {
      db.prepare("INSERT INTO team_members (team_id, email, role) VALUES (?, ?, ?)").run(id, input.email, input.role || "member");
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") throw badRequest("Member already exists in team");
      throw err;
    }
    res.status(201).json({ ok: true });
  }));

  app.delete("/api/teams/:id/members/:email", authenticate, asyncHandler(async (req: any, res) => {
    const { id, email } = req.params;
    const me = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND email = ?").get(id, req.user.email) as any;
    if (!me || !["owner", "admin"].includes(me.role)) throw badRequest("Only owner/admin can remove members");
    db.prepare("DELETE FROM team_members WHERE team_id = ? AND email = ?").run(id, email);
    res.json({ ok: true });
  }));

  app.patch("/api/teams/:id/members/:email", authenticate, asyncHandler(async (req: any, res) => {
    const { id, email } = req.params;
    const me = db.prepare("SELECT role FROM team_members WHERE team_id = ? AND email = ?").get(id, req.user.email) as any;
    if (!me || me.role !== "owner") throw badRequest("Only owner can change roles");
    const input = validate<{ role: string }>(req.body, { role: { type: "string", required: true, enum: ROLES } });
    db.prepare("UPDATE team_members SET role = ? WHERE team_id = ? AND email = ?").run(input.role, id, email);
    res.json({ ok: true });
  }));

  // =========================================================
  // 3. Test Scheduling
  // =========================================================
  app.get("/api/schedules", authenticate, asyncHandler(async (req: any, res) => {
    const rows = db
      .prepare("SELECT id, name, cron_expr, enabled, browser, last_run_at, next_run_at, created_at FROM scheduled_tests WHERE owner_email = ? ORDER BY created_at DESC")
      .all(req.user.email);
    res.json({ schedules: rows });
  }));

  app.post("/api/schedules", authenticate, rateLimit({ limit: 20, windowMs: 60_000, key: "schedules:create" }), asyncHandler(async (req: any, res) => {
    const input = validate<{ name: string; cronExpr: string; testConfig: any; browser?: string }>(req.body, {
      name: { type: "string", required: true, min: 1, max: 200 },
      cronExpr: { type: "string", required: true, min: 5, max: 100 },
      testConfig: { type: "object", required: true },
      browser: { type: "string", enum: SUPPORTED_BROWSERS },
    });
    if (!validateCronExpr(input.cronExpr)) throw badRequest("Invalid cron expression. Expected: 'minute hour day month dow'");
    const id = `sched_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    db.prepare(`
      INSERT INTO scheduled_tests (id, name, cron_expr, test_config, owner_email, browser)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, input.name, input.cronExpr, JSON.stringify(input.testConfig), req.user.email, input.browser || "chromium");
    res.status(201).json({ id, enabled: true });
  }));

  app.patch("/api/schedules/:id", authenticate, asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const row = db.prepare("SELECT * FROM scheduled_tests WHERE id = ? AND owner_email = ?").get(id, req.user.email);
    if (!row) throw notFound("Schedule not found");
    const input = validate<{ enabled?: boolean; cronExpr?: string; name?: string; browser?: string }>(req.body, {
      enabled: { type: "boolean" },
      cronExpr: { type: "string", max: 100 },
      name: { type: "string", min: 1, max: 200 },
      browser: { type: "string", enum: SUPPORTED_BROWSERS },
    });
    if (input.cronExpr && !validateCronExpr(input.cronExpr)) throw badRequest("Invalid cron expression");
    const updates: string[] = [];
    const params: any[] = [];
    if (input.enabled !== undefined) { updates.push("enabled = ?"); params.push(input.enabled ? 1 : 0); }
    if (input.cronExpr) { updates.push("cron_expr = ?"); params.push(input.cronExpr); }
    if (input.name) { updates.push("name = ?"); params.push(input.name); }
    if (input.browser) { updates.push("browser = ?"); params.push(input.browser); }
    if (!updates.length) return res.json({ ok: true, noop: true });
    params.push(id);
    db.prepare(`UPDATE scheduled_tests SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ ok: true });
  }));

  app.delete("/api/schedules/:id", authenticate, asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const row = db.prepare("SELECT id FROM scheduled_tests WHERE id = ? AND owner_email = ?").get(id, req.user.email);
    if (!row) throw notFound("Schedule not found");
    db.prepare("DELETE FROM scheduled_tests WHERE id = ?").run(id);
    res.json({ ok: true });
  }));

  // Kick off the scheduler background loop
  startScheduler(db, async (row) => {
    const id = `sched_run_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const summary = `Triggered by schedule "${row.name}" at ${new Date().toISOString()}`;
    db.prepare(`
      INSERT INTO run_history (id, test_id, browser, status, duration_ms, summary, owner_email, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, row.id, row.browser, "scheduled", 0, summary, row.owner_email, "scheduled");
  });

  // =========================================================
  // 4. Browser/Device Matrix
  // =========================================================
  app.get("/api/browsers", (_req, res) => {
    res.json({
      browsers: SUPPORTED_BROWSERS,
      devices: Object.keys(DEVICE_PRESETS),
      devicePresets: DEVICE_PRESETS,
    });
  });

  app.post("/api/run-browser", authenticate, rateLimit({ limit: 20, windowMs: 60_000, key: "run:browser" }), asyncHandler(async (req, res) => {
    const input = validate<{ url: string; browser?: string; device?: string }>(req.body, {
      url: { type: "string", required: true, max: 500 },
      browser: { type: "string", enum: SUPPORTED_BROWSERS },
      device: { type: "string", enum: Object.keys(DEVICE_PRESETS) as any },
    });
    const browserName = (input.browser as SupportedBrowser) || "chromium";
    const preset = input.device ? DEVICE_PRESETS[input.device as DevicePreset] : undefined;
    const start = Date.now();
    let browser: any = null;
    try {
      browser = await launchBrowser(browserName);
      const ctx = await browser.newContext(preset ? { viewport: preset.viewport, isMobile: preset.isMobile } : {});
      const page = await ctx.newPage();
      const response = await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 15_000 });
      const title = await page.title();
      const status = response?.status() ?? null;
      await browser.close();
      res.json({
        browser: browserName,
        device: input.device || "default",
        url: input.url,
        title,
        httpStatus: status,
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      if (browser) await browser.close().catch(() => {});
      throw badRequest(`Browser run failed: ${err?.message || err}`);
    }
  }));

  // =========================================================
  // 5. CI/CD Integrations
  // =========================================================
  app.get("/api/cicd/:provider", asyncHandler(async (req, res) => {
    const { provider } = req.params;
    const testCommand = typeof req.query.command === "string" ? req.query.command.slice(0, 200) : undefined;
    const nodeVersion = typeof req.query.node === "string" ? req.query.node.slice(0, 10) : undefined;
    const cfg = renderCICDConfig(provider, { testCommand, nodeVersion });
    res.json(cfg);
  }));

  app.get("/api/cicd", (_req, res) => {
    res.json({
      providers: ["github", "circleci", "jenkins", "gitlab"],
      usage: "GET /api/cicd/:provider?command=<test cmd>&node=20",
    });
  });

  // =========================================================
  // 6. Test Analytics Dashboard (backend aggregates)
  // =========================================================
  app.get("/api/analytics/summary", authenticate, asyncHandler(async (req: any, res) => {
    const days = Math.min(Number(req.query.days) || 7, 90);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const own = req.user.email;

    const totalRuns = (db.prepare("SELECT COUNT(*) AS n FROM run_history WHERE owner_email = ? AND created_at >= ?").get(own, since) as any).n;
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) AS n FROM run_history
      WHERE owner_email = ? AND created_at >= ?
      GROUP BY status
    `).all(own, since);
    const byBrowser = db.prepare(`
      SELECT browser, COUNT(*) AS n, AVG(duration_ms) AS avg_duration
      FROM run_history
      WHERE owner_email = ? AND created_at >= ?
      GROUP BY browser
    `).all(own, since);
    const daily = db.prepare(`
      SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total,
             SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM run_history
      WHERE owner_email = ? AND created_at >= ?
      GROUP BY day
      ORDER BY day ASC
    `).all(own, since);
    const flaky = db.prepare(`
      SELECT test_id, COUNT(*) AS runs,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS fails
      FROM run_history
      WHERE owner_email = ? AND created_at >= ? AND test_id IS NOT NULL
      GROUP BY test_id
      HAVING fails > 0 AND fails < runs AND runs >= 3
      ORDER BY fails DESC
      LIMIT 10
    `).all(own, since);

    res.json({ windowDays: days, totalRuns, byStatus, byBrowser, daily, flakyTests: flaky });
  }));

  // =========================================================
  // 7. Test History with comparison
  // =========================================================
  app.post("/api/run-history", authenticate, rateLimit({ limit: 120, windowMs: 60_000, key: "history:add" }), asyncHandler(async (req: any, res) => {
    const input = validate<{ testId?: string; browser?: string; status: string; durationMs?: number; summary?: string; tags?: string }>(req.body, {
      testId: { type: "string", max: 100 },
      browser: { type: "string", enum: SUPPORTED_BROWSERS },
      status: { type: "string", required: true, max: 50 },
      durationMs: { type: "number", min: 0 },
      summary: { type: "string", max: 5000 },
      tags: { type: "string", max: 500 },
    });
    const id = `run_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    db.prepare(`
      INSERT INTO run_history (id, test_id, browser, status, duration_ms, summary, owner_email, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.testId || null,
      input.browser || "chromium",
      input.status,
      input.durationMs || 0,
      input.summary || null,
      req.user.email,
      input.tags || null
    );
    res.status(201).json({ id });
  }));

  app.get("/api/run-history", authenticate, asyncHandler(async (req: any, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const testId = typeof req.query.testId === "string" ? req.query.testId : null;
    const rows = testId
      ? db.prepare("SELECT * FROM run_history WHERE owner_email = ? AND test_id = ? ORDER BY created_at DESC LIMIT ?").all(req.user.email, testId, limit)
      : db.prepare("SELECT * FROM run_history WHERE owner_email = ? ORDER BY created_at DESC LIMIT ?").all(req.user.email, limit);
    res.json({ runs: rows });
  }));

  app.get("/api/run-history/compare", authenticate, asyncHandler(async (req: any, res) => {
    const ids = typeof req.query.ids === "string" ? req.query.ids.split(",").filter(Boolean) : [];
    if (ids.length < 2 || ids.length > 5) throw badRequest("Provide 2-5 run ids via ?ids=a,b");
    const placeholders = ids.map(() => "?").join(",");
    const rows = db.prepare(`SELECT * FROM run_history WHERE owner_email = ? AND id IN (${placeholders})`).all(req.user.email, ...ids) as any[];
    if (rows.length !== ids.length) throw notFound("One or more runs not found");
    const diff = {
      statusChanged: new Set(rows.map((r) => r.status)).size > 1,
      durationDelta: rows.length >= 2 ? (rows[rows.length - 1].duration_ms - rows[0].duration_ms) : 0,
      avgDuration: Math.round(rows.reduce((s, r) => s + (r.duration_ms || 0), 0) / rows.length),
    };
    res.json({ runs: rows, diff });
  }));

  app.get("/api/run-history/trends", authenticate, asyncHandler(async (req: any, res) => {
    const testId = typeof req.query.testId === "string" ? req.query.testId : null;
    if (!testId) throw badRequest("testId is required");
    const rows = db.prepare(`
      SELECT substr(created_at, 1, 10) AS day,
             AVG(duration_ms) AS avg_duration,
             SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) AS passed,
             SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
             COUNT(*) AS total
      FROM run_history
      WHERE owner_email = ? AND test_id = ?
      GROUP BY day
      ORDER BY day ASC
      LIMIT 90
    `).all(req.user.email, testId);
    res.json({ testId, trend: rows });
  }));

  // =========================================================
  // 8. Parallel Testing
  // =========================================================
  app.post("/api/run-parallel", authenticate, rateLimit({ limit: 5, windowMs: 60_000, key: "run:parallel" }), asyncHandler(async (req: any, res) => {
    const input = validate<{ urls: string[]; browser?: string; concurrency?: number }>(req.body, {
      urls: { type: "array", required: true, max: 20 },
      browser: { type: "string", enum: SUPPORTED_BROWSERS },
      concurrency: { type: "number", min: 1, max: 10 },
    });
    if (!input.urls.every((u) => typeof u === "string" && /^https?:\/\//.test(u))) {
      throw badRequest("urls must all be http(s) strings");
    }
    const browserName = (input.browser as SupportedBrowser) || "chromium";
    const suiteId = `par_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    // Fire and respond immediately — client polls status
    void (async () => {
      try {
        const browser = await launchBrowser(browserName);
        const items = input.urls.map((url) => ({
          id: url,
          run: async () => {
            const ctx = await browser.newContext();
            const page = await ctx.newPage();
            const start = Date.now();
            try {
              const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
              const title = await page.title();
              const duration = Date.now() - start;
              db.prepare(`INSERT INTO run_history (id, test_id, browser, status, duration_ms, summary, owner_email, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(`${suiteId}_${crypto.randomBytes(3).toString("hex")}`, suiteId, browserName, resp?.ok() ? "passed" : "failed", duration, `${title} (${resp?.status()})`, req.user.email, "parallel");
              return { url, title, status: resp?.status(), duration };
            } finally {
              await ctx.close();
            }
          },
        }));
        await runInParallel(suiteId, items, input.concurrency || MAX_PARALLEL);
        await browser.close();
      } catch (err: any) {
        console.warn("[parallel] failed:", err?.message);
      }
    })();

    res.status(202).json({
      suiteId,
      accepted: input.urls.length,
      browser: browserName,
      concurrency: input.concurrency || MAX_PARALLEL,
      pollAt: `/api/run-parallel/${suiteId}`,
    });
  }));

  app.get("/api/run-parallel/:suiteId", authenticate, (req, res) => {
    const state = getParallelRunStatus(req.params.suiteId);
    if (!state) {
      return res.json({ done: true, note: "No active run. It may have completed and cleaned up. Check /api/run-history?testId=<suiteId>" });
    }
    res.json({
      done: state.completed === state.total,
      total: state.total,
      completed: state.completed,
      failed: state.failed,
      elapsedMs: Date.now() - state.startedAt,
      results: state.results,
    });
  });

}

// Re-export for API_DOCS extension
export const FEATURE_ENDPOINTS = [
  { method: "GET", path: "/auth/oauth/providers", auth: false, summary: "List enabled OAuth providers" },
  { method: "GET", path: "/auth/oauth/:provider/start", auth: false, summary: "Start OAuth flow — returns redirect URL" },
  { method: "GET", path: "/auth/oauth/:provider/callback", auth: false, summary: "OAuth callback (scaffold)" },
  { method: "POST", path: "/teams", auth: true, summary: "Create a team" },
  { method: "GET", path: "/teams", auth: true, summary: "List your teams" },
  { method: "GET", path: "/teams/:id/members", auth: true, summary: "List team members" },
  { method: "POST", path: "/teams/:id/members", auth: true, summary: "Add member (owner/admin only)" },
  { method: "PATCH", path: "/teams/:id/members/:email", auth: true, summary: "Change role (owner only)" },
  { method: "DELETE", path: "/teams/:id/members/:email", auth: true, summary: "Remove member" },
  { method: "GET", path: "/schedules", auth: true, summary: "List scheduled tests" },
  { method: "POST", path: "/schedules", auth: true, summary: "Create a scheduled test (cron, browser, config)" },
  { method: "PATCH", path: "/schedules/:id", auth: true, summary: "Enable/disable/update a schedule" },
  { method: "DELETE", path: "/schedules/:id", auth: true, summary: "Delete a schedule" },
  { method: "GET", path: "/browsers", auth: false, summary: "Supported browsers + device presets" },
  { method: "POST", path: "/run-browser", auth: true, summary: "Run against a browser/device preset" },
  { method: "GET", path: "/cicd", auth: false, summary: "Supported CI/CD providers" },
  { method: "GET", path: "/cicd/:provider", auth: false, summary: "Get CI/CD config for github/circleci/jenkins/gitlab" },
  { method: "GET", path: "/analytics/summary", auth: true, summary: "Aggregates: by status/browser/daily + flaky tests" },
  { method: "POST", path: "/run-history", auth: true, summary: "Record a test run" },
  { method: "GET", path: "/run-history", auth: true, summary: "List run history (?testId filter)" },
  { method: "GET", path: "/run-history/compare", auth: true, summary: "Compare 2-5 runs by ?ids=" },
  { method: "GET", path: "/run-history/trends", auth: true, summary: "Daily trend for ?testId=" },
  { method: "POST", path: "/run-parallel", auth: true, summary: "Run multiple URLs in parallel (async)" },
  { method: "GET", path: "/run-parallel/:suiteId", auth: true, summary: "Poll parallel suite status" },
];
