import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { importJaffleShopDataSource } from "@/lib/sample-data";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST() {
  try {
    await requireSession("admin");
    const imported = await importJaffleShopDataSource();
    return NextResponse.json({ ok: true, ...imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "导入测试数据库失败" }, { status: 400 });
  }
}
