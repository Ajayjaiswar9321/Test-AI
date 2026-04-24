import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const runs = await prisma.run.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const withDuration = runs.filter((r) => r.duration !== null && r.duration > 0);
    const durations = withDuration.map((r) => r.duration as number).sort((a, b) => a - b);

    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Duration = durations[p95Index] || 0;

    const passed = runs.filter((r) => r.status === "PASSED").length;
    const total = runs.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    const byDay: Record<string, { totalDuration: number; count: number }> = {};
    for (const r of withDuration) {
      const d = r.createdAt.toISOString().slice(0, 10);
      if (!byDay[d]) byDay[d] = { totalDuration: 0, count: 0 };
      byDay[d].totalDuration += r.duration as number;
      byDay[d].count++;
    }

    const timeline = Object.entries(byDay)
      .map(([date, v]) => ({
        date,
        avgDuration: v.totalDuration / v.count,
        count: v.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      avgDuration,
      p95Duration,
      passRate,
      totalRuns: total,
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to compute metrics" },
      { status: 500 }
    );
  }
}
