import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const runs = await prisma.run.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        test: { select: { id: true, name: true } },
      },
    });

    const anomalies: {
      runId: string;
      testName: string;
      type: string;
      severity: "high" | "medium" | "low";
      message: string;
      detectedAt: string;
    }[] = [];

    const byTest: Record<string, typeof runs> = {};
    for (const r of runs) {
      const key = r.test.id;
      if (!byTest[key]) byTest[key] = [];
      byTest[key].push(r);
    }

    for (const [, testRuns] of Object.entries(byTest)) {
      const durations = testRuns
        .filter((r) => r.duration && r.duration > 0)
        .map((r) => r.duration as number);

      if (durations.length >= 5) {
        const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
        const stdDev = Math.sqrt(
          durations.reduce((a, d) => a + Math.pow(d - mean, 2), 0) / durations.length
        );

        for (const r of testRuns.slice(0, 5)) {
          if (r.duration && r.duration > mean + 2 * stdDev && stdDev > 0) {
            anomalies.push({
              runId: r.id,
              testName: r.test.name,
              type: "Duration Spike",
              severity: r.duration > mean + 3 * stdDev ? "high" : "medium",
              message: `Duration ${(r.duration / 1000).toFixed(
                2
              )}s is ${((r.duration / mean - 1) * 100).toFixed(0)}% above baseline (${(mean / 1000).toFixed(2)}s)`,
              detectedAt: r.createdAt.toISOString(),
            });
          }
        }
      }

      const last10 = testRuns.slice(0, 10);
      if (last10.length >= 5) {
        let flips = 0;
        for (let i = 1; i < last10.length; i++) {
          if (last10[i].status !== last10[i - 1].status) flips++;
        }
        if (flips >= 3) {
          anomalies.push({
            runId: last10[0].id,
            testName: last10[0].test.name,
            type: "Flakiness",
            severity: flips >= 5 ? "high" : "medium",
            message: `Status flipped ${flips} times in last ${last10.length} runs — likely flaky`,
            detectedAt: last10[0].createdAt.toISOString(),
          });
        }
      }

      const errorCounts: Record<string, number> = {};
      for (const r of testRuns) {
        if (r.errorMessage) {
          const key = r.errorMessage.slice(0, 50);
          errorCounts[key] = (errorCounts[key] || 0) + 1;
        }
      }
      for (const [err, count] of Object.entries(errorCounts)) {
        if (count >= 3) {
          const r = testRuns.find((x) => x.errorMessage?.startsWith(err));
          if (r) {
            anomalies.push({
              runId: r.id,
              testName: r.test.name,
              type: "Recurring Error",
              severity: count >= 5 ? "high" : "low",
              message: `Same error seen ${count} times: "${err}..."`,
              detectedAt: r.createdAt.toISOString(),
            });
          }
        }
      }
    }

    anomalies.sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    return NextResponse.json({ anomalies: anomalies.slice(0, 20) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to detect anomalies" },
      { status: 500 }
    );
  }
}
