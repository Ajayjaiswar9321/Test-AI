import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { brokenSelector, dom } = await request.json();

  if (!dom) {
    return NextResponse.json({ candidates: [] });
  }

  const candidates: { selector: string; confidence: number; reason: string }[] = [];

  const testIdMatch = dom.match(/data-testid="([^"]+)"/g);
  if (testIdMatch) {
    for (const m of testIdMatch) {
      const id = m.match(/data-testid="([^"]+)"/)?.[1];
      if (id) {
        candidates.push({
          selector: `[data-testid="${id}"]`,
          confidence: 95,
          reason: "Stable test-id attribute",
        });
      }
    }
  }

  const roleButtonMatch = dom.match(/<button[^>]*>([^<]+)<\/button>/g);
  if (roleButtonMatch) {
    for (const m of roleButtonMatch) {
      const text = m.match(/>([^<]+)</)?.[1]?.trim();
      if (text) {
        candidates.push({
          selector: `getByRole('button', { name: '${text}' })`,
          confidence: 82,
          reason: "Role + accessible name",
        });
      }
    }
  }

  const nameMatch = dom.match(/name="([^"]+)"/g);
  if (nameMatch) {
    for (const m of nameMatch) {
      const name = m.match(/name="([^"]+)"/)?.[1];
      if (name) {
        candidates.push({
          selector: `[name="${name}"]`,
          confidence: 75,
          reason: "Named form field",
        });
      }
    }
  }

  const classMatch = dom.match(/class="([^"]+)"/g);
  if (classMatch) {
    for (const m of classMatch.slice(0, 3)) {
      const cls = m.match(/class="([^"]+)"/)?.[1]?.split(" ")[0];
      if (cls) {
        candidates.push({
          selector: `.${cls}`,
          confidence: 55,
          reason: "Class selector (may change)",
        });
      }
    }
  }

  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    if (seen.has(c.selector)) return false;
    seen.add(c.selector);
    return true;
  });

  unique.sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    brokenSelector,
    candidates: unique.slice(0, 6),
  });
}
