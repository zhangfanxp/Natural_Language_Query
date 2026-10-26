import { NextResponse } from "next/server";
import { isSetupComplete } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ setupComplete: await isSetupComplete() });
}
