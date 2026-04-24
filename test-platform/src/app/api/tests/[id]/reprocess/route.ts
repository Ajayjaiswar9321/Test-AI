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
      include: {
        processingSteps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Update test status to PROCESSING
    await prisma.test.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    // Reset all processing steps to pending
    await prisma.processingStep.updateMany({
      where: { testId: id },
      data: { status: "pending" },
    });

    // If no processing steps exist, create default ones
    const existingSteps = await prisma.processingStep.count({
      where: { testId: id },
    });

    if (existingSteps === 0) {
      const defaultSteps = [
        "Analyzing instructions",
        "Generating test plan",
        "Writing test code",
        "Validating test",
        "Finalizing",
      ];

      await prisma.processingStep.createMany({
        data: defaultSteps.map((title, index) => ({
          testId: id,
          stepIndex: index,
          title,
          status: "pending",
        })),
      });
    }

    const updatedTest = await prisma.test.findUnique({
      where: { id },
      include: {
        processingSteps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });

    return NextResponse.json(updatedTest);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reprocess test" },
      { status: 500 }
    );
  }
}
