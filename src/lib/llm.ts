import "server-only";

import OpenAI from "openai";
import { getLlmCredentials } from "@/lib/config";

export interface PlannedQuery {
  connectionId: string;
  purpose: string;
  sql: string;
}

export interface QueryPlan {
  clarification: string | null;
  queries: PlannedQuery[];
  answerInstructions: string;
}

function extractJson(content: string): QueryPlan {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) throw new Error("LLM 未返回有效的查询计划，请重新描述问题");
  const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Partial<QueryPlan>;
  return {
    clarification: typeof parsed.clarification === "string" && parsed.clarification.trim() ? parsed.clarification.trim() : null,
    queries: Array.isArray(parsed.queries) ? parsed.queries.filter((query): query is PlannedQuery =>
      typeof query?.connectionId === "string" && typeof query?.sql === "string" && query.sql.trim().length > 0,
    ) : [],
    answerInstructions: typeof parsed.answerInstructions === "string" ? parsed.answerInstructions : "请直接、准确地回答用户的问题。",
  };
}

async function getClient() {
  const config = await getLlmCredentials();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl, timeout: 90_000, maxRetries: 1 });
  return { client, model: config.model };
}

export async function createQueryPlan(input: {
  question: string;
  currentDate: string;
  connections: Array<{
    id: string;
    name: string;
    database: string;
    tables: Array<{ name: string; modelName: string; description: string; foreignKeys?: Array<{ name: string; columns: string[]; referencedTable: string; referencedColumns: string[] }>; columns: Array<{ name: string; type: string; description: string }> }>;
  }>;
  relationships: Array<{ name: string; leftConnectionId: string; leftTable: string; leftColumn: string; rightConnectionId: string; rightTable: string; rightColumn: string; description: string }>;
  businessRules: string;
}) {
  const { client, model } = await getClient();
  const systemPrompt = `你是企业数据分析 SQL 规划器。根据用户问题和给定的数据目录，输出 JSON 格式的只读查询计划。\n\n规则：\n- 只能使用提供的数据源 ID、Wren 模型名和字段名，SQL 必须针对 Wren 模型编写，而不是物理表名。\n- 同一数据库内需要多表查询时，优先遵循数据目录中的外键关系；Wren 已按这些关系构建语义模型。\n- 每条 SQL 只能查询一个数据源，跨库问题请为相关数据源分别生成查询。\n- 只生成 SELECT 或 WITH ... SELECT；禁止写入、修改、删除、DDL、存储过程和多语句。\n- 为大型明细查询加入合理 LIMIT；回答统计问题时优先在数据库内聚合。\n- 日期和时区以请求提供的 Asia/Shanghai 当前日期为准；“上个月”“本月”等按自然月理解，除非业务规则另有定义。\n- 如果业务口径不明确、找不到可靠的数据源或无法确定跨库关联，queries 返回空数组，并在 clarification 中用中文询问用户；不要猜测。\n- 在跨库计划中，按已提供的关联关系选择对应连接键，并在各条结果中保留该键。\n- 只能返回 JSON，不要 Markdown 代码围栏。格式：{"clarification": null, "queries": [{"connectionId":"数据源ID","purpose":"用途","sql":"SELECT ..."}], "answerInstructions":"结果汇总说明"}`;
  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify({ currentDate: input.currentDate, timezone: "Asia/Shanghai", question: input.question, dataCatalog: input.connections, crossDatabaseRelationships: input.relationships, businessRules: input.businessRules }) },
    ],
  });
  return extractJson(completion.choices[0]?.message?.content ?? "");
}

export async function composeNaturalLanguageAnswer(input: {
  question: string;
  currentDate: string;
  instructions: string;
  businessRules: string;
  relationships: Array<{ name: string; leftConnectionName: string; leftTable: string; leftColumn: string; rightConnectionName: string; rightTable: string; rightColumn: string; description: string }>;
  results: Array<{ connectionName: string; purpose: string; rows: Record<string, unknown>[]; rowCount: number }>;
}) {
  const { client, model } = await getClient();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "你是企业数据分析助手。仅根据查询结果回答，不要编造缺失信息。跨库时按配置的关联口径合并。日期计算以 Asia/Shanghai 时区和请求提供的当前日期为准。用中文简洁说明结论、计算口径和必要的限制；如果数据不足，要明确指出。",
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || "查询已完成，但模型没有返回可展示的文字。";
}

export async function testLlmConfiguration(input: { baseUrl: string; model: string; apiKey: string }) {
  // Hosted inference endpoints may queue a cold/large model longer than 30 seconds.
  const client = new OpenAI({ apiKey: input.apiKey, baseURL: input.baseUrl.replace(/\/+$/, ""), timeout: 120_000, maxRetries: 0 });
  const response = await client.chat.completions.create({
    model: input.model,
    messages: [{ role: "user", content: "只回复：连接成功" }],
    max_tokens: 16,
  });
  return response.choices[0]?.message?.content?.trim() || "连接成功";
}

export function parseQueryPlan(content: string) {
  return extractJson(content);
}
