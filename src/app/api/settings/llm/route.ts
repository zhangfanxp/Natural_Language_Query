import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { getLlmCredentials, saveLlmConfiguration } from "@/lib/config";
import { testLlmConfiguration } from "@/lib/llm";

export const runtime = "nodejs";

const llmSchema = z.object({
  provider: z.string().trim().max(100).default("OpenAI 兼容"),
  baseUrl: z.string().trim().url(),
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().max(1000).optional().default(""),
});

export async function POST(request: Request) {
  try {
    await requireSession("admin");
    const parsed = llmSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "请检查 LLM 地址、模型名称和密钥" }, { status: 400 });
    await saveLlmConfiguration(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireSession("admin");
    const body = await request.json().catch(() => ({})) as { apiKey?: string };
    const existing = await getLlmCredentials();
    const response = await testLlmConfiguration({
      baseUrl: existing.baseUrl,
      model: existing.model,
      apiKey: body.apiKey?.trim() || existing.apiKey,
    });
    return NextResponse.json({ ok: true, response });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "LLM 连接测试失败" }, { status: 400 });
  }
}
