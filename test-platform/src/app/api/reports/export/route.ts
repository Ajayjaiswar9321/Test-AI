import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "junit";

  const runs = await prisma.run.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      test: { select: { id: true, name: true } },
      steps: true,
    },
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(runs, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="test-report.json"',
      },
    });
  }

  if (format === "csv") {
    const header = "id,test,status,duration_ms,started_at,completed_at,error";
    const rows = runs.map((r) =>
      [
        r.id,
        JSON.stringify(r.test.name),
        r.status,
        r.duration || "",
        r.startedAt?.toISOString() || "",
        r.completedAt?.toISOString() || "",
        JSON.stringify(r.errorMessage || ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="test-report.csv"',
      },
    });
  }

  // JUnit XML
  const bySuite: Record<string, typeof runs> = {};
  for (const r of runs) {
    const key = r.test.name;
    if (!bySuite[key]) bySuite[key] = [];
    bySuite[key].push(r);
  }

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const totalTests = runs.length;
  const totalFailures = runs.filter((r) => r.status === "FAILED").length;
  const totalTime = runs.reduce((a, r) => a + (r.duration || 0), 0) / 1000;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites name="TestPlatform" tests="${totalTests}" failures="${totalFailures}" time="${totalTime.toFixed(
    2
  )}">\n`;

  for (const [suiteName, suiteRuns] of Object.entries(bySuite)) {
    const suiteFailures = suiteRuns.filter((r) => r.status === "FAILED").length;
    const suiteTime = suiteRuns.reduce((a, r) => a + (r.duration || 0), 0) / 1000;
    xml += `  <testsuite name="${esc(suiteName)}" tests="${suiteRuns.length}" failures="${suiteFailures}" time="${suiteTime.toFixed(2)}">\n`;

    for (const r of suiteRuns) {
      const time = ((r.duration || 0) / 1000).toFixed(2);
      xml += `    <testcase name="${esc(r.id)}" classname="${esc(suiteName)}" time="${time}"`;

      if (r.status === "FAILED") {
        xml += `>\n      <failure message="${esc(r.errorMessage || "Test failed")}">${esc(
          r.errorMessage || ""
        )}</failure>\n    </testcase>\n`;
      } else if (r.status === "CANCELLED") {
        xml += `>\n      <skipped/>\n    </testcase>\n`;
      } else {
        xml += `/>\n`;
      }
    }

    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>\n`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": 'attachment; filename="test-report.xml"',
    },
  });
}
