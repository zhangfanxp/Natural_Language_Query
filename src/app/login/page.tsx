"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "登录失败");
      router.push("/workspace");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid-paper relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute left-[12%] top-[12%] h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="relative grid w-full max-w-[920px] overflow-hidden rounded-[30px] border border-white/80 bg-white/80 shadow-[0_35px_100px_rgba(35,55,95,.15)] backdrop-blur-xl md:grid-cols-[1fr_.9fr]">
        <section className="relative hidden min-h-[570px] flex-col justify-between overflow-hidden bg-[#172542] p-12 text-white md:flex">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 15% 5%, #89aaff 0, transparent 36%), radial-gradient(circle at 100% 80%, #53d6b2 0, transparent 32%)" }} />
          <div className="relative flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Database size={19} /></div><div><div className="text-sm font-semibold tracking-[.18em]">WREN</div><div className="mt-0.5 text-[11px] text-blue-100/70">ENTERPRISE DATA</div></div></div>
          <div className="relative max-w-sm"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs text-blue-100"><Sparkles size={13} />你的企业数据工作台</div><h1 className="text-[40px] font-semibold leading-[1.16] tracking-tight">从问题出发，<br /><span className="text-[#70dfc3]">找到数据答案</span></h1><p className="mt-5 text-sm leading-7 text-blue-100/70">跨系统理解业务语境，把复杂查询变成清楚、可追溯的回答。</p></div>
          <div className="relative flex items-center gap-3 text-xs text-blue-100/60"><span className="h-2 w-2 rounded-full bg-[#64dfbf]" />企业内部问数空间</div>
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-white/10" />
        </section>
        <section className="flex min-h-[570px] flex-col justify-center px-7 py-12 sm:px-12">
          <div className="mb-9 md:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172542] text-white"><Database size={19} /></div></div>
          <div className="mb-8"><div className="mb-3 text-xs font-semibold uppercase tracking-[.17em] text-blue-600">Welcome back</div><h2 className="text-2xl font-semibold tracking-tight text-slate-900">登录问数空间</h2><p className="mt-2 text-sm text-slate-500">输入你的企业账号，继续探索数据。</p></div>
          <form onSubmit={submit} className="space-y-5">
            <div><label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">账号</label><div className="relative"><KeyRound size={16} className="absolute left-4 top-4 text-slate-400" /><input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></div></div>
            <div><label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">密码</label><div className="relative"><input id="password" autoComplete="current-password" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入登录密码" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600" aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            {error && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4169e1] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#345bd0] disabled:cursor-wait disabled:opacity-60">{busy ? "正在登录…" : "登录"}<ArrowRight size={16} /></button>
          </form>
          <p className="mt-7 text-center text-xs text-slate-400">账号由企业管理员在服务器上维护。</p>
        </section>
      </div>
    </main>
  );
}
