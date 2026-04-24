import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event || !data) {
      return NextResponse.json(
        { error: "Missing event or data in request body" },
        { status: 400 }
      );
    }

    switch (event) {
      case "test.create": {
        const { name, instructions, baseUrl } = data;
        await prisma.test.create({
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
        });
        break;
      }

      case "test.update": {
        const { id, ...updateData } = data;
        if (!id) {
          return NextResponse.json(
            { error: "Test ID is required for test.update event" },
            { status: 400 }
          );
        }
        await prisma.test.update({
          where: { id },
          data: updateData,
        });
        break;
      }

      case "run.trigger": {
        const { testId } = data;
        if (!testId) {
          return NextResponse.json(
            { error: "testId is required for run.trigger event" },
            { status: 400 }
          );
        }

        const test = await prisma.test.findUnique({
          where: { id: testId },
        });

        if (!test) {
          return NextResponse.json(
            { error: "Test not found" },
            { status: 404 }
          );
        }

        await prisma.run.create({
          data: {
            testId,
            status: "QUEUED",
          },
        });
        break;
      }

      case "run.update": {
        const { id: runId, ...runUpdateData } = data;
        if (!runId) {
          return NextResponse.json(
            { error: "Run ID is required for run.update event" },
            { status: 400 }
          );
        }
        await prisma.run.update({
          where: { id: runId },
          data: runUpdateData,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown event type: ${event}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
