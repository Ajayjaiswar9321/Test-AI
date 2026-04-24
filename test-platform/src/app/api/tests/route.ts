import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = 20;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (status) {
      where.status = status;
    }

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { runs: true } },
          runs: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { status: true },
          },
        },
      }),
      prisma.test.count({ where }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({ tests, total, page, totalPages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch tests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, instructions, baseUrl } = body;

    const test = await prisma.test.create({
      data: {
        name,
        instructions,
        baseUrl: baseUrl || null,
        status: "PROCESSING",
        processingSteps: {
          create: [
            { stepIndex: 0, title: "Analyzing instructions", status: "pending" },
            { stepIndex: 1, title: "Generating test plan", status: "pending" },
            { stepIndex: 2, title: "Writing test code", status: "pending" },
            { stepIndex: 3, title: "Validating test", status: "pending" },
            { stepIndex: 4, title: "Finalizing", status: "pending" },
          ],
        },
      },
      include: {
        processingSteps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create test" },
      { status: 500 }
    );
  }
}
