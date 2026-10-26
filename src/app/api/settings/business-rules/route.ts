import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { saveBusinessRules } from "@/lib/config";

const bodySchema = z.object({ businessRules: z.string().max(30_000) });

export async function PUT(request: Request) {
  try {
    await requireSession("admin");
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "业务口径内容无效" }, { status: 400 });
    await saveBusinessRules(parsed.data.businessRules);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 401 });
  }
}
