import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        runs: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { steps: true },
        },
        secrets: true,
        processingSteps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch test" },
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

    const allowedFields = [
      "name",
      "instructions",
      "schedule",
      "notificationSetting",
      "baseUrl",
      "generatedCode",
      "status",
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const test = await prisma.test.update({
      where: { id },
      data,
    });

    return NextResponse.json(test);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update test" },
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

    await prisma.test.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete test" },
      { status: 500 }
    );
  }
}
