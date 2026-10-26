"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importSampleDatabase, setImportSampleDatabase] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.setupComplete) router.replace("/login");
        else setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("密码至少需要 8 位");
    if (password !== confirmPassword) return setError("两次输入的密码不一致");
    setBusy(true);
    try {
      const response = await fetch("/api/setup", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, importSampleDatabase }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "初始化失败");
      router.push("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "初始化失败");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="grid-paper flex min-h-screen items-center justify-center text-sm text-slate-500">正在检查系统状态…</div>;

  return (
    <main className="grid-paper relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute -left-28 top-12 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/70 bg-white/75 shadow-[0_35px_100px_rgba(35,55,95,.14)] backdrop-blur-xl md:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-[#172542] p-12 text-white md:flex">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, #84a8ff 0, transparent 34%), radial-gradient(circle at 90% 80%, #53d6b2 0, transparent 28%)" }} />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Database size={20} /></div>
            <div><div className="text-sm font-semibold tracking-[.18em]">WREN</div><div className="mt-0.5 text-[11px] text-blue-100/70">ENTERPRISE DATA</div></div>
          </div>
          <div className="relative z-10 max-w-md">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-xs text-blue-100"><Sparkles size={13} />自然语言，直达业务答案</div>
            <h1 className="text-[42px] font-semibold leading-[1.16] tracking-tight">让企业数据<br /><span className="text-[#70dfc3]">开始对话</span></h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-blue-100/70">连接业务系统、财务系统与 OA，让可信的业务口径贯穿每一次提问。</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-xs text-blue-100/60"><ShieldCheck size={16} />本地部署 · 语义可追溯 · 权限清晰</div>
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -right-6 h-48 w-48 rounded-full border border-white/10" />
        </section>
        <section className="flex min-h-[590px] flex-col justify-center px-7 py-12 sm:px-12">
          <div className="mb-9 md:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172542] text-white"><Database size={19} /></div></div>
          <div className="mb-8">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[.17em] text-blue-600">First-time setup</div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">初始化你的问数空间</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">设置管理员登录密码，也可以在初始化时加入示例数据库体验问数流程。</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">管理员账号</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm"><KeyRound size={14} /></span>admin <span className="ml-auto text-xs text-slate-400">默认账号</span></div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">设置密码</label>
              <div className="relative">
                <input id="password" autoComplete="new-password" type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                <button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600" aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirm-password">再次输入密码</label>
              <input id="confirm-password" autoComplete="new-password" type={visible ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="确认管理员密码" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-blue-200 hover:bg-blue-50/50">
              <input type="checkbox" checked={importSampleDatabase} onChange={(event) => setImportSampleDatabase(event.target.checked)} className="mt-1 h-4 w-4 accent-[#4169e1]" />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Database size={15} className="text-[#4169e1]" />导入 Jaffle Shop 测试数据库</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">包含 8 张 DuckDB 示例表，用于体验自然语言问数；不会连接或修改你的 MySQL。</span>
              </span>
            </label>
            {error && <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4169e1] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[#345bd0] disabled:cursor-wait disabled:opacity-60">
              {busy ? (importSampleDatabase ? "正在导入示例库并初始化…" : "正在初始化…") : "创建管理员并继续"}<ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-slate-400">密码将以安全哈希形式保存在服务器的 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">user.json</code> 中。</p>
        </section>
      </div>
    </main>
  );
}
