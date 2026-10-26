import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { deleteConnection } from "@/lib/config";
import { deleteWrenProject } from "@/lib/wren-service";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireSession("admin");
    const { id } = await context.params;
    await deleteWrenProject(id);
    await deleteConnection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 400 });
  }
}
