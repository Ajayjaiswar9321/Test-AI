import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { requirement } = await request.json();

  if (!requirement || typeof requirement !== "string") {
    return NextResponse.json({ error: "requirement required" }, { status: 400 });
  }

  const text = requirement.toLowerCase();
  const steps: string[] = [];

  const patterns: { match: RegExp; step: string }[] = [
    { match: /sign\s*up|register|create account/, step: "Navigate to signup page" },
    { match: /log\s*in|sign\s*in|login/, step: "Navigate to login page" },
    { match: /email/, step: "Fill email field" },
    { match: /password/, step: "Fill password field" },
    { match: /submit|click.*button|press/, step: "Click submit button" },
    { match: /redirect|navigate|go to/, step: "Wait for page navigation" },
    { match: /dashboard/, step: "Verify dashboard is visible" },
    { match: /welcome|greet/, step: "Verify welcome message appears" },
    { match: /checkout/, step: "Proceed to checkout" },
    { match: /cart/, step: "Verify cart contents" },
    { match: /add.*item|add to cart/, step: "Add item to cart" },
    { match: /payment|pay/, step: "Fill payment form" },
    { match: /error/, step: "Verify error message" },
    { match: /profile/, step: "Verify profile data" },
    { match: /logout|sign out/, step: "Click logout" },
  ];

  for (const p of patterns) {
    if (p.match.test(text) && !steps.includes(p.step)) steps.push(p.step);
  }

  if (steps.length === 0) {
    steps.push(
      "Navigate to target page",
      "Perform primary user action",
      "Verify expected outcome"
    );
  }

  const nameMatch = requirement.match(/^(.{3,60}?)[.,\n]/);
  const name = nameMatch
    ? nameMatch[1].replace(/^when\s+/i, "").trim()
    : requirement.slice(0, 60);

  const code = `import { test, expect } from '@playwright/test';

test('${name.replace(/'/g, "\\'")}', async ({ page }) => {
${steps
  .map((s, i) => {
    const cmd = stepToPlaywright(s);
    return `  // Step ${i + 1}: ${s}\n  ${cmd}`;
  })
  .join("\n\n")}
});
`;

  return NextResponse.json({ name, steps, code });
}

function stepToPlaywright(step: string): string {
  const s = step.toLowerCase();
  if (s.includes("navigate") && s.includes("signup"))
    return "await page.goto('/signup');";
  if (s.includes("navigate") && s.includes("login"))
    return "await page.goto('/login');";
  if (s.includes("navigate")) return "await page.goto('/');";
  if (s.includes("email"))
    return "await page.getByLabel('Email').fill('user@example.com');";
  if (s.includes("password"))
    return "await page.getByLabel('Password').fill('securePass123');";
  if (s.includes("submit") || s.includes("click"))
    return "await page.getByRole('button', { name: /submit|continue/i }).click();";
  if (s.includes("wait") && s.includes("navigation"))
    return "await page.waitForURL(/.*dashboard.*/);";
  if (s.includes("verify") && s.includes("dashboard"))
    return "await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();";
  if (s.includes("verify") && s.includes("welcome"))
    return "await expect(page.getByText(/welcome/i)).toBeVisible();";
  if (s.includes("checkout"))
    return "await page.getByRole('button', { name: /checkout/i }).click();";
  if (s.includes("cart"))
    return "await expect(page.locator('[data-testid=\"cart\"]')).toBeVisible();";
  if (s.includes("add") && s.includes("cart"))
    return "await page.getByRole('button', { name: /add to cart/i }).click();";
  if (s.includes("payment"))
    return "await page.getByLabel('Card number').fill('4242424242424242');";
  if (s.includes("error"))
    return "await expect(page.getByRole('alert')).toBeVisible();";
  if (s.includes("logout"))
    return "await page.getByRole('button', { name: /log out|sign out/i }).click();";
  return "// TODO: implement step";
}
