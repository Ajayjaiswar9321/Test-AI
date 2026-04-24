import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const test = await prisma.test.findUnique({
      where: { id },
      select: { id: true, generatedCode: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Parse generated code for steps, or use sample steps
    let stepNames: string[] = [];

    if (test.generatedCode) {
      // Try to extract step names from generated code comments or function names
      const stepMatches = test.generatedCode.match(
        /(?:\/\/\s*Step[:\s]*|test\(["']|it\(["'])([^"'\n]+)/gi
      );
      if (stepMatches && stepMatches.length > 0) {
        stepNames = stepMatches.map((match) =>
          match
            .replace(/(?:\/\/\s*Step[:\s]*|test\(["']|it\(["'])/i, "")
            .trim()
        );
      }
    }

    if (stepNames.length === 0) {
      stepNames = [
        "Navigate to page",
        "Verify page loaded",
        "Execute test actions",
        "Validate results",
        "Cleanup",
      ];
    }

    const run = await prisma.run.create({
      data: {
        testId: id,
        status: "QUEUED",
        steps: {
          create: stepNames.map((action, index) => ({
            stepIndex: index,
            action,
            status: "QUEUED",
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    // Simulate starting the run by updating status to RUNNING
    const updatedRun = await prisma.run.update({
      where: { id: run.id },
      data: { status: "RUNNING" },
      include: {
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json(updatedRun, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to trigger run" },
      { status: 500 }
    );
  }
}
