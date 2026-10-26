import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { replaceRelationships } from "@/lib/config";

const relationshipSchema = z.object({
  relationships: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    leftConnectionId: z.string().min(1), leftTable: z.string().min(1), leftColumn: z.string().min(1),
    rightConnectionId: z.string().min(1), rightTable: z.string().min(1), rightColumn: z.string().min(1),
    description: z.string().max(1000).default(""),
  })).max(100),
});

export async function PUT(request: Request) {
  try {
    await requireSession("admin");
    const parsed = relationshipSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "跨库关联关系格式无效" }, { status: 400 });
    await replaceRelationships(parsed.data.relationships);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存关联失败" }, { status: 400 });
  }
}
