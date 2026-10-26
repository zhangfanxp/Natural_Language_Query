import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getConfiguration, upsertConnection } from "@/lib/config";
import { discoverSchema, slugify, testMySqlConnection } from "@/lib/mysql";
import { syncWrenProject } from "@/lib/wren-service";
import type { TableDefinition } from "@/lib/types";

export const runtime = "nodejs";

const connectionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(),
  name: z.string().trim().min(1).max(100),
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  database: z.string().trim().min(1).max(255),
  username: z.string().trim().min(1).max(255),
  password: z.string().max(1000).optional().default(""),
});

export async function GET() {
  try {
    await requireSession();
    const config = await getConfiguration();
    return NextResponse.json({ connections: config.connections.map((connection) => ({
      id: connection.id, name: connection.name, database: connection.database,
      enabled: connection.enabled, tableCount: connection.tables.length,
    })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取数据源失败" }, { status: 401 });
  }
}

function preserveDescriptions(discovered: TableDefinition[], previous: TableDefinition[] = []) {
  return discovered.map((table) => {
    const existingTable = previous.find((item) => item.name === table.name);
    return {
      ...table,
      description: existingTable?.description || table.description,
      columns: table.columns.map((column) => {
        const existingColumn = existingTable?.columns.find((item) => item.name === column.name);
        return {
          ...column,
          description: existingColumn?.description || column.description,
          modelName: existingColumn?.modelName || slugify(column.name),
        };
      }),
      modelName: existingTable?.modelName || slugify(table.name),
    };
  });
}

export async function POST(request: Request) {
  try {
    await requireSession("admin");
    const parsed = connectionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请填写数据源名称、MySQL 地址、数据库、账号和密码" }, { status: 400 });
    const previousConfig = await getConfiguration();
    const id = parsed.data.id || randomUUID();
    const previous = previousConfig.connections.find((item) => item.id === id);
    const password = parsed.data.password || (previous ? await import("@/lib/secrets").then(({ decryptSecret }) => decryptSecret(previous.passwordEncrypted)) : "");
    const input = { ...parsed.data, password };
    await testMySqlConnection(input);
    const discovered = preserveDescriptions(await discoverSchema(input), previous?.tables);
    if (discovered.length === 0) return NextResponse.json({ error: "连接成功，但指定数据库中没有可读取的数据表" }, { status: 422 });
    const connection = await upsertConnection({
      id,
      name: parsed.data.name,
      engine: "mysql",
      host: parsed.data.host,
      port: parsed.data.port,
      database: parsed.data.database,
      username: parsed.data.username,
      password,
      enabled: true,
      tables: discovered,
    });
    let wren: { ok: boolean; modelCount?: number; message?: string } = { ok: false };
    try {
      const result = await syncWrenProject(connection);
      wren = { ok: true, modelCount: result.modelCount };
    } catch (error) {
      wren = { ok: false, message: error instanceof Error ? error.message : "Wren 同步失败" };
    }
    return NextResponse.json({ ok: true, id, tableCount: discovered.length, wren }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "添加数据源失败" }, { status: 400 });
  }
}
