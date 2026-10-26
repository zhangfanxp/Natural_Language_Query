import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  return session
    ? NextResponse.json({ user: session })
    : NextResponse.json({ error: "请先登录" }, { status: 401 });
}
