import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.setting.findMany();

    const settingsObject: Record<string, string> = {};
    for (const setting of settings) {
      settingsObject[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObject);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const upsertPromises = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await Promise.all(upsertPromises);

    // Return all settings after update
    const settings = await prisma.setting.findMany();
    const settingsObject: Record<string, string> = {};
    for (const setting of settings) {
      settingsObject[setting.key] = setting.value;
    }

    return NextResponse.json(settingsObject);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
