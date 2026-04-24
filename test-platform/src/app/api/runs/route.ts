import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const dateRange = searchParams.get("dateRange");
    const perPage = 20;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (testId) {
      where.testId = testId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.test = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (dateRange) {
      const now = new Date();
      let dateFrom: Date | null = null;

      switch (dateRange) {
        case "last24h":
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "last7d":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "last30d":
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
    }

    const [runs, total] = await Promise.all([
      prisma.run.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        include: {
          test: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.run.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({ runs, total, page, totalPages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch runs" },
      { status: 500 }
    );
  }
}
