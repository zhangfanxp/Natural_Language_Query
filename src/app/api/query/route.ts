import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getConfiguration, getLlmCredentials } from "@/lib/config";
import { composeNaturalLanguageAnswer, createQueryPlan } from "@/lib/llm";
import { runWrenQuery } from "@/lib/wren-service";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  question: z.string().trim().min(2).max(4000),
  connectionIds: z.array(z.string()).max(50).optional(),
});

function assertReadOnlyQuery(sql: string) {
  const normalized = sql.trim();
  if (!/^(select|with)\b/i.test(normalized)) throw new Error("只允许执行只读 SELECT 查询");
  if (normalized.replace(/;\s*$/, "").includes(";")) throw new Error("一次只允许执行一条 SQL");
  if (/\b(insert|update|delete|replace|create|drop|alter|truncate|grant|revoke|call|execute|outfile|dumpfile)\b/i.test(normalized)) {
    throw new Error("查询中包含不允许的写入或管理操作");
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请输入自然语言问题" }, { status: 400 });
    const config = await getConfiguration();
    const selected = parsed.data.connectionIds === undefined
      ? null
      : new Set(parsed.data.connectionIds);
    const connections = config.connections.filter((connection) => connection.enabled && (!selected || selected.has(connection.id)));
    if (!connections.length) return NextResponse.json({ error: "请先在设置中添加并启用数据源，或导入测试数据库" }, { status: 400 });
    const availableIds = new Set(connections.map((connection) => connection.id));
    const availableRelationships = config.relationships.filter((relationship) =>
      availableIds.has(relationship.leftConnectionId) && availableIds.has(relationship.rightConnectionId),
    );
    await getLlmCredentials();
    const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const plan = await createQueryPlan({
      question: parsed.data.question,
      currentDate,
      businessRules: config.businessRules,
      relationships: availableRelationships,
      connections: connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        database: connection.database,
        tables: connection.tables.map((table) => ({
          name: table.name,
          modelName: table.modelName,
          description: table.description,
          foreignKeys: table.foreignKeys ?? [],
          columns: table.columns.map((column) => ({ name: column.name, type: column.type, description: column.description })),
        })),
      })),
    });

    if (plan.clarification) {
      return NextResponse.json({ clarification: plan.clarification, queries: [], results: [] });
    }
    if (!plan.queries.length) {
      return NextResponse.json({ clarification: "当前数据目录不足以可靠回答这个问题。请补充业务口径或跨库关联关系后再试。", queries: [], results: [] });
    }
    if (plan.queries.length > 20) throw new Error("查询计划包含过多 SQL，请缩小问题范围后重试");
    const allowedIds = availableIds;
    const results = [];
    for (const query of plan.queries) {
      if (!allowedIds.has(query.connectionId)) throw new Error("LLM 计划引用了未选中的数据源，已停止执行");
      assertReadOnlyQuery(query.sql);
      const connection = connections.find((item) => item.id === query.connectionId)!;
      const result = await runWrenQuery(connection.id, query.sql);
      results.push({
        connectionId: connection.id,
        connectionName: connection.name,
        purpose: query.purpose,
        sql: query.sql,
        expandedSql: result.expandedSql,
        rows: result.rows,
        rowCount: result.rowCount,
        truncated: result.truncated,
      });
    }

    const answer = await composeNaturalLanguageAnswer({
      question: parsed.data.question,
      currentDate,
      instructions: plan.answerInstructions,
      businessRules: config.businessRules,
      relationships: availableRelationships.map((relationship) => ({
        name: relationship.name,
        leftConnectionName: config.connections.find((item) => item.id === relationship.leftConnectionId)?.name || relationship.leftConnectionId,
        leftTable: relationship.leftTable,
        leftColumn: relationship.leftColumn,
        rightConnectionName: config.connections.find((item) => item.id === relationship.rightConnectionId)?.name || relationship.rightConnectionId,
        rightTable: relationship.rightTable,
        rightColumn: relationship.rightColumn,
        description: relationship.description,
      })),
      results: results.map(({ connectionName, purpose, rows, rowCount }) => ({ connectionName, purpose, rows, rowCount })),
    });
    return NextResponse.json({ answer, results, clarification: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败，请稍后重试";
    const status = message === "请先登录" ? 401 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
