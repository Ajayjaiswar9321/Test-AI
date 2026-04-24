import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tests = await prisma.test.findMany({
      select: {
        id: true,
        name: true,
        runs: {
          select: {
            status: true,
            duration: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    const scores = tests.map((t) => {
      const runs = t.runs;
      const total = runs.length;
      const failed = runs.filter((r) => r.status === "FAILED").length;
      const failureRate = total > 0 ? (failed / total) * 100 : 0;
      const avgDuration =
        runs.filter((r) => r.duration).reduce((a, r) => a + (r.duration || 0), 0) /
        Math.max(1, runs.filter((r) => r.duration).length);
      const lastRunStatus = runs[0]?.status || null;

      const recencyPenalty =
        lastRunStatus === "FAILED" ? 30 : lastRunStatus === "PASSED" ? -10 : 0;
      const durationPenalty = Math.min(20, (avgDuration || 0) / 1000);
      const riskScore = Math.max(
        0,
        Math.min(100, failureRate + recencyPenalty + durationPenalty)
      );

      let priority: "critical" | "high" | "medium" | "low" = "low";
      if (riskScore >= 70) priority = "critical";
      else if (riskScore >= 50) priority = "high";
      else if (riskScore >= 25) priority = "medium";

      return {
        id: t.id,
        name: t.name,
        failureRate,
        avgDuration,
        lastRunStatus,
        riskScore,
        priority,
      };
    });

    scores.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ scores });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to compute risk scores" },
      { status: 500 }
    );
  }
}
