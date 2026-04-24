import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const suites = await prisma.suite.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            tests: true,
            runs: true,
          },
        },
        runs: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { status: true },
        },
      },
    });

    return NextResponse.json(suites);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch suites" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, testIds } = body;

    const suite = await prisma.suite.create({
      data: {
        name,
        description: description || null,
        ...(testIds && testIds.length > 0
          ? {
              tests: {
                create: testIds.map((testId: string, index: number) => ({
                  testId,
                  order: index,
                })),
              },
            }
          : {}),
      },
      include: {
        tests: {
          include: { test: true },
        },
        _count: {
          select: {
            tests: true,
            runs: true,
          },
        },
      },
    });

    return NextResponse.json(suite, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create suite" },
      { status: 500 }
    );
  }
}
