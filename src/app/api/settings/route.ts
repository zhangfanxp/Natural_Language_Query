import { NextResponse } from "next/server";
import { getPublicConfiguration } from "@/lib/config";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "只有管理员可以查看系统设置" }, { status: 403 });
  return NextResponse.json(await getPublicConfiguration());
}
