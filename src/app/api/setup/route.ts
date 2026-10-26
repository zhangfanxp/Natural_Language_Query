import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { emptyConfiguration, getMasterKey, isSetupComplete, writeConfiguration, writeUsers } from "@/lib/storage";
import { importJaffleShopDataSource } from "@/lib/sample-data";

export const runtime = "nodejs";
export const maxDuration = 180;

const setupSchema = z.object({
  password: z.string().min(8).max(200),
  importSampleDatabase: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  if (await isSetupComplete()) {
    return NextResponse.json({ error: "系统已经完成首次设置" }, { status: 409 });
  }
  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "管理员密码至少需要 8 位" }, { status: 400 });

  try {
    await getMasterKey(true);
    await writeConfiguration(emptyConfiguration());
    if (parsed.data.importSampleDatabase) await importJaffleShopDataSource();
    await writeUsers([{ username: "admin", passwordHash: hashPassword(parsed.data.password), role: "admin", enabled: true }]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "初始化失败" }, { status: 500 });
  }
}
