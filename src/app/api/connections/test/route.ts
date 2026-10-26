import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { testMySqlConnection } from "@/lib/mysql";

export const runtime = "nodejs";

const mysqlSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  database: z.string().trim().min(1).max(255),
  username: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    await requireSession("admin");
    const parsed = mysqlSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请完整填写 MySQL 连接信息" }, { status: 400 });
    const result = await testMySqlConnection(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "数据库连接失败" }, { status: 400 });
  }
}
