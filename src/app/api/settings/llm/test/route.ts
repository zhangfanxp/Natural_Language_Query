import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getLlmCredentials } from "@/lib/config";
import { testLlmConfiguration } from "@/lib/llm";

export const runtime = "nodejs";

const testSchema = z.object({ baseUrl: z.string().trim().url().optional(), model: z.string().trim().min(1).optional(), apiKey: z.string().optional() });

export async function POST(request: Request) {
  try {
    await requireSession("admin");
    const parsed = testSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "请检查 LLM 配置" }, { status: 400 });
    const existing = await getLlmCredentials().catch(() => null);
    const baseUrl = parsed.data.baseUrl || existing?.baseUrl;
    const model = parsed.data.model || existing?.model;
    const apiKey = parsed.data.apiKey?.trim() || existing?.apiKey;
    if (!baseUrl || !model || !apiKey) return NextResponse.json({ error: "请填写 API 地址、模型和 API Key" }, { status: 400 });
    const response = await testLlmConfiguration({ baseUrl, model, apiKey });
    return NextResponse.json({ ok: true, response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM 连接测试失败";
    if (/timed out|timeout/i.test(message)) {
      return NextResponse.json({ error: "模型服务超过 120 秒仍未响应。请确认模型端点可用，或换用响应更快的可用模型后重试。" }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
