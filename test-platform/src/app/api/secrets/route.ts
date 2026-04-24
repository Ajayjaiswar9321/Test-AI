import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function maskValue(value: string): string {
  if (value.length <= 4) {
    return "****";
  }
  const first2 = value.slice(0, 2);
  const last2 = value.slice(-2);
  const masked = "*".repeat(Math.min(value.length - 4, 20));
  return `${first2}${masked}${last2}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId");

    const where: any = {};
    if (testId) {
      where.testId = testId;
    }

    const secrets = await prisma.testSecret.findMany({
      where,
      orderBy: { id: "desc" },
    });

    const maskedSecrets = secrets.map((secret) => ({
      ...secret,
      value: maskValue(secret.value),
    }));

    return NextResponse.json(maskedSecrets);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch secrets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, testId } = body;

    const secret = await prisma.testSecret.create({
      data: {
        key,
        value,
        testId: testId || null,
      },
    });

    return NextResponse.json(
      {
        ...secret,
        value: maskValue(secret.value),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create secret" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Secret ID is required" },
        { status: 400 }
      );
    }

    await prisma.testSecret.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete secret" },
      { status: 500 }
    );
  }
}
