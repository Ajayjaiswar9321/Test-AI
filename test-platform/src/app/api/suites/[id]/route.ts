import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const suite = await prisma.suite.findUnique({
      where: { id },
      include: {
        tests: {
          include: { test: true },
          orderBy: { order: "asc" },
        },
        runs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            runs: {
              include: { test: true },
            },
          },
        },
      },
    });

    if (!suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    return NextResponse.json(suite);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch suite" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, testIds } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    // If testIds provided, delete existing and recreate
    if (testIds !== undefined) {
      await prisma.suiteTest.deleteMany({
        where: { suiteId: id },
      });

      if (testIds.length > 0) {
        await prisma.suiteTest.createMany({
          data: testIds.map((testId: string, index: number) => ({
            suiteId: id,
            testId,
            order: index,
          })),
        });
      }
    }

    const suite = await prisma.suite.update({
      where: { id },
      data,
      include: {
        tests: {
          include: { test: true },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            tests: true,
            runs: true,
          },
        },
      },
    });

    return NextResponse.json(suite);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update suite" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.suite.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete suite" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (body.action !== "run") {
      return NextResponse.json(
        { error: "Invalid action. Use { action: 'run' }" },
        { status: 400 }
      );
    }

    // Get all tests in the suite
    const suiteTests = await prisma.suiteTest.findMany({
      where: { suiteId: id },
      include: { test: true },
      orderBy: { order: "asc" },
    });

    if (suiteTests.length === 0) {
      return NextResponse.json(
        { error: "Suite has no tests" },
        { status: 400 }
      );
    }

    // Create a SuiteRun
    const suiteRun = await prisma.suiteRun.create({
      data: {
        suiteId: id,
        status: "RUNNING",
        runs: {
          create: suiteTests.map((st) => ({
            testId: st.testId,
            status: "QUEUED",
          })),
        },
      },
      include: {
        runs: {
          include: { test: true },
        },
      },
    });

    return NextResponse.json(suiteRun, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to run suite" },
      { status: 500 }
    );
  }
}
