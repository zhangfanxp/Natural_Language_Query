import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, verifyPassword } from "@/lib/auth";
import { readUsers } from "@/lib/storage";

export const runtime = "nodejs";

const loginSchema = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
  const users = await readUsers();
  const user = users?.find((entry) => entry.enabled && entry.username === parsed.data.username);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "账号或密码不正确" }, { status: 401 });
  }
  try {
    const token = await createSessionToken(user);
    const response = NextResponse.json({ ok: true, username: user.username, role: user.role });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "登录失败" }, { status: 500 });
  }
}
