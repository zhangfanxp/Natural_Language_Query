"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, ArrowUpRight, Database, LogOut, MessageSquareText, Settings2, Sparkles, UserRound } from "lucide-react";

export function AppShell({ children, username, role }: { children: React.ReactNode; username: string; role: "admin" | "user" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = role === "admin";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] md:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-[#172542] text-white md:flex">
        <div className="flex h-[78px] items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/10 text-[#75dfc5] ring-1 ring-white/10"><Database size={19} /></div>
          <div><div className="text-[13px] font-semibold tracking-[.17em]">WREN</div><div className="mt-0.5 text-[10px] tracking-[.12em] text-blue-100/50">ENTERPRISE DATA</div></div>
        </div>
        <div className="mx-4 mb-5 h-px bg-white/10" />
        <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-blue-100/40">工作台</div>
        <nav className="space-y-1 px-3">
          <NavItem href="/workspace" active={pathname === "/workspace"} icon={<MessageSquareText size={17} />} label="智能问数" />
          {isAdmin && <NavItem href="/settings" active={pathname.startsWith("/settings")} icon={<Settings2 size={17} />} label="系统设置" />}
        </nav>
        <div className="mx-5 my-6 h-px bg-white/10" />
        <div className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-blue-100/40">服务状态</div>
        <div className="mx-4 mt-1 rounded-2xl border border-white/10 bg-white/[.045] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-50"><Activity size={15} className="text-[#73dfc4]" />本机数据引擎</div>
          <p className="mt-2 text-[11px] leading-5 text-blue-100/45">配置数据源后，系统会通过 Wren 语义层执行查询。</p>
        </div>
        <div className="mt-auto p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9eeff] text-xs font-bold text-[#3858b8]">{username.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold text-white">{username}</div><div className="mt-0.5 text-[10px] text-blue-100/45">{isAdmin ? "系统管理员" : "企业用户"}</div></div>
            <button onClick={() => setMenuOpen((open) => !open)} className="rounded-lg p-1.5 text-blue-100/55 hover:bg-white/10 hover:text-white" aria-label="账户菜单"><UserRound size={15} /></button>
          </div>
          {menuOpen && <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-blue-100/75 hover:bg-white/10"><LogOut size={14} />退出登录</button>}
          <div className="mt-4 flex items-center justify-between px-2 text-[10px] text-blue-100/30"><span>WREN INTELLIGENCE</span><ArrowUpRight size={12} /></div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:hidden">
        <Link href="/workspace" className="flex items-center gap-2 font-semibold text-[#172542]"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#172542] text-[#75dfc5]"><Database size={15} /></span>WREN 问数</Link>
        <div className="flex items-center gap-1">
          {isAdmin && <Link href="/settings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="系统设置"><Settings2 size={18} /></Link>}
          <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="退出登录"><LogOut size={18} /></button>
        </div>
      </header>
      <div className="min-h-screen min-w-0 flex-1 md:ml-[250px]">
        <div className="hidden h-[78px] items-center justify-between border-b border-slate-200/80 bg-white/75 px-8 md:flex">
          <div className="flex items-center gap-2 text-xs text-slate-400"><span>企业数据空间</span><span className="text-slate-300">/</span><span className="font-medium text-slate-600">{pathname.startsWith("/settings") ? "系统设置" : "智能问数"}</span></div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-[11px] font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />本地应用在线<Sparkles size={13} className="ml-1 text-emerald-500" /></div>
        </div>
        <main className="mx-auto w-full max-w-[1420px] px-4 pb-12 pt-5 sm:px-6 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return <Link href={href} className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] transition ${active ? "bg-white text-[#172542] shadow-sm" : "text-blue-100/65 hover:bg-white/[.07] hover:text-white"}`}>
    <span className={active ? "text-[#4169e1]" : "text-blue-100/45 group-hover:text-blue-100"}>{icon}</span>{label}
    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#57cdb1]" />}
  </Link>;
}
