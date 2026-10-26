import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getConnectionWithPassword, updateConnectionMetadata } from "@/lib/config";
import { syncWrenProject } from "@/lib/wren-service";

const metadataSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    modelName: z.string().min(1).max(100),
    description: z.string().max(2000),
    foreignKeys: z.array(z.object({ name: z.string(), columns: z.array(z.string()), referencedTable: z.string(), referencedColumns: z.array(z.string()) })).optional(),
    columns: z.array(z.object({
      name: z.string(), type: z.string(), nullable: z.boolean(), primaryKey: z.boolean(),
      description: z.string().max(2000), modelName: z.string(),
    })),
  })),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession("admin");
    const { id } = await context.params;
    const parsed = metadataSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "表结构说明格式无效" }, { status: 400 });
    await updateConnectionMetadata(id, parsed.data.tables);
    const connection = await getConnectionWithPassword(id);
    let wrenWarning: string | undefined;
    try {
      await syncWrenProject(connection);
    } catch (error) {
      wrenWarning = error instanceof Error ? error.message : "Wren 同步失败";
    }
    return NextResponse.json({ ok: true, wrenWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}
