import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        test: true,
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch run" },
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
      "status",
      "duration",
      "errorMessage",
      "consoleOutput",
      "rrwebEvents",
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const run = await prisma.run.update({
      where: { id },
      data,
    });

    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update run" },
      { status: 500 }
    );
  }
}
