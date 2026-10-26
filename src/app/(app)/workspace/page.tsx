"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Database, MessageSquareText, Send, Sparkles, Table2 } from "lucide-react";
import { ThinkingOverlay } from "@/components/thinking-overlay";

type Source = { id: string; name: string; database: string; enabled: boolean; tableCount: number };
type QueryResult = { connectionId: string; connectionName: string; purpose: string; sql: string; expandedSql?: string; rows: Record<string, unknown>[]; rowCount: number; truncated: boolean };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; results?: QueryResult[]; clarification?: boolean; error?: boolean; createdAt: Date };
const createLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const examples = [
  { icon: "↗", title: "上个月销售总额", prompt: "上个月的销售总金额是多少？" },
  { icon: "⌁", title: "每日销售趋势", prompt: "本月前两周的每日销售金额分别是多少？" },
  { icon: "✳", title: "跨系统员工分析", prompt: "上个月销售业绩排名前三名的业务员都是什么学历，入职时间有多久？" },
];

export default function WorkspacePage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const enabledSources = useMemo(() => sources.filter((source) => source.enabled), [sources]);

  useEffect(() => {
    fetch("/api/connections", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "无法读取数据源");
        setSources(data.connections || []);
        setSelected((data.connections || []).filter((source: Source) => source.enabled).map((source: Source) => source.id));
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "无法读取数据源"));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function ask(value = question) {
    const text = value.trim();
    if (!text || busy) return;
    setQuestion("");
    setActiveQuestion(text);
    setBusy(true);
    const userMessage: ChatMessage = { id: createLocalId(), role: "user", content: text, createdAt: new Date() };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await fetch("/api/query", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, connectionIds: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "查询失败");
      setMessages((current) => [...current, {
        id: createLocalId(), role: "assistant", content: data.answer || data.clarification || "没有生成回答。",
        results: data.results || [], clarification: Boolean(data.clarification), createdAt: new Date(),
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: createLocalId(), role: "assistant", content: error instanceof Error ? error.message : "查询失败，请重试。", error: true, createdAt: new Date(),
      }]);
    } finally {
      setBusy(false);
      setActiveQuestion("");
    }
  }

  function toggleSource(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <>
    <div className="animate-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4169e1]"><Sparkles size={13} />Wren Intelligence</div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">智能问数</h1>
          <p className="mt-1.5 text-sm text-slate-500">用自然语言提问，让企业数据为你提供答案。</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 panel-shadow"><span className="h-2 w-2 rounded-full bg-emerald-500" />{enabledSources.length} 个数据源已连接</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_284px]">
        <section className="flex min-h-[640px] flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white panel-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4169e1]"><MessageSquareText size={17} /></div><div><div className="text-sm font-semibold text-slate-800">数据分析对话</div><div className="mt-0.5 text-[11px] text-slate-400">支持跨业务系统综合分析</div></div></div>
            <div className="relative">
              <button onClick={() => setSourcePickerOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"><Database size={14} className="text-slate-400" />{selected.length === enabledSources.length ? "自动选择数据源" : `${selected.length} 个数据源`}<ChevronDown size={13} className="text-slate-400" /></button>
              {sourcePickerOpen && <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {enabledSources.length === 0 && <div className="px-3 py-4 text-xs text-slate-500">尚未配置数据源</div>}
                {enabledSources.map((source) => <button key={source.id} onClick={() => toggleSource(source.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"><span className={`flex h-4 w-4 items-center justify-center rounded border ${selected.includes(source.id) ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"}`}>{selected.includes(source.id) && <Check size={11} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-700">{source.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{source.database}</span></span></button>)}
                <div className="border-t border-slate-100 px-3 pb-1 pt-2 text-[10px] leading-4 text-slate-400">选中的数据库会提供给问题分析使用。</div>
              </div>}
            </div>
          </div>

          <div ref={listRef} className="scrollbar-slim flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
            {messages.length === 0 && <div className="flex min-h-[420px] flex-col items-center justify-center px-4 text-center">
              <div className="relative mb-7 flex h-20 w-20 items-center justify-center rounded-[27px] bg-gradient-to-br from-[#e8edff] to-[#e5faf5] text-[#4169e1]"><Database size={29} /><span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-[#4ccaa9] text-white"><Sparkles size={12} /></span></div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-800">今天想了解什么？</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">直接提问，系统会根据业务口径定位相关数据源，必要时跨系统整合结果。</p>
              <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                {examples.map((example) => <button key={example.title} onClick={() => setQuestion(example.prompt)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md"><span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-[#4169e1] transition group-hover:bg-blue-100">{example.icon}</span><span className="block text-xs font-semibold text-slate-700">{example.title}</span><span className="mt-1.5 block text-[11px] leading-5 text-slate-400">{example.prompt}</span></button>)}
              </div>
              {enabledSources.length === 0 && <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800"><CircleHelp size={15} />请管理员先在系统设置中配置 LLM 和 MySQL 数据源。</div>}
            </div>}

            {messages.map((message) => <ChatBubble key={message.id} message={message} />)}
            {loadError && <div className="text-center text-xs text-rose-500">{loadError}</div>}
          </div>

          <div className="border-t border-slate-100 bg-[#fcfdff] px-4 pb-4 pt-3 sm:px-6">
            <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-blue-300 focus-within:shadow-[0_0_0_4px_rgba(65,105,225,.08)]">
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} rows={2} placeholder="例如：上个月销售排名前三的业务员，分别来自哪个部门？" className="max-h-36 min-h-[56px] w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-300" />
              <div className="flex items-center justify-between px-1 pb-0.5"><div className="flex items-center gap-1 text-[10px] text-slate-400"><span className="rounded-md bg-slate-100 px-2 py-1">{selected.length === enabledSources.length ? "多数据源" : "指定数据源"}</span><span>按 Enter 发送</span></div><button type="submit" disabled={busy || !question.trim()} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-4 text-xs font-semibold text-white transition hover:bg-[#345bd0] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"><span>发送</span><Send size={13} /></button></div>
            </form>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400"><Clock3 size={11} />回答基于当前配置的数据和业务口径</div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-5 panel-shadow">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold text-slate-800">已接入系统</div><button onClick={() => window.location.assign("/settings")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="配置数据源"><ArrowUp size={14} className="rotate-45" /></button></div>
            <p className="mt-1 text-[11px] text-slate-400">问题可在一个或多个系统中检索</p>
            <div className="mt-4 space-y-2.5">
              {enabledSources.slice(0, 5).map((source, index) => <div key={source.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${index % 2 ? "bg-[#e9f8f3] text-[#239e7d]" : "bg-[#eef2ff] text-[#4169e1]"}`}><Database size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-700">{source.name}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{source.tableCount} 张数据表</div></div><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></div>)}
              {enabledSources.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center"><Database size={20} className="mx-auto text-slate-300" /><p className="mt-2 text-xs text-slate-500">尚未连接数据库</p><button onClick={() => window.location.assign("/settings")} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700">添加第一个数据源</button></div>}
              {enabledSources.length > 5 && <div className="text-center text-[10px] text-slate-400">还有 {enabledSources.length - 5} 个系统</div>}
            </div>
          </div>
          <div className="overflow-hidden rounded-[22px] bg-[#172542] p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold"><Table2 size={15} className="text-[#72dfc4]" />数据口径提示</div>
            <p className="mt-3 text-[11px] leading-5 text-blue-100/65">业务指标依赖管理员维护的字段说明、指标定义和跨库关联关系。遇到口径不明确时，系统会先向你确认。</p>
            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] text-blue-100/45"><span className="h-1.5 w-1.5 rounded-full bg-[#6ddbbf]" />结果来自已配置的数据源</div>
          </div>
        </aside>
      </div>
    </div>
    <ThinkingOverlay open={busy} question={activeQuestion} />
    </>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const [openResult, setOpenResult] = useState<string | null>(null);
  if (message.role === "user") {
    return <div className="flex justify-end gap-3"><div className="max-w-[82%] rounded-2xl rounded-tr-md bg-[#4169e1] px-4 py-3 text-sm leading-6 text-white shadow-sm">{message.content}</div><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-600">我</div></div>;
  }
  return (
    <div className="flex items-start gap-3 animate-in">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.error ? "bg-rose-50 text-rose-500" : "bg-[#eaf0ff] text-[#4169e1]"}`}><Sparkles size={15} /></div>
      <div className="min-w-0 max-w-[92%] flex-1">
        <div className={`rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-7 ${message.error ? "border border-rose-100 bg-rose-50 text-rose-700" : message.clarification ? "border border-amber-100 bg-amber-50 text-amber-900" : "bg-[#f7f9fd] text-slate-700"}`}><div className="whitespace-pre-wrap">{message.content}</div></div>
        {!!message.results?.length && <div className="mt-3 space-y-2">{message.results.map((result, index) => {
          const resultKey = `${result.connectionId}-${index}`;
          const isOpen = openResult === resultKey;
          return <div key={resultKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button onClick={() => setOpenResult((current) => current === resultKey ? null : resultKey)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"><Database size={13} className="text-blue-500" /><span className="text-xs font-medium text-slate-700">{result.connectionName}</span><span className="text-[10px] text-slate-400">{result.purpose}</span><span className="ml-auto text-[10px] text-slate-400">{result.rowCount} 行</span>{isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}</button>
            {isOpen && <div className="border-t border-slate-100"><div className="scrollbar-slim max-h-64 overflow-auto"><ResultTable rows={result.rows} /></div><details className="border-t border-slate-100"><summary className="cursor-pointer px-3 py-2 text-[10px] font-medium text-slate-500">查看生成 SQL</summary><pre className="scrollbar-slim overflow-x-auto bg-[#f7f9fd] px-3 py-2.5 text-[10px] leading-5 text-slate-600">{result.expandedSql || result.sql}</pre></details></div>}
          </div>;
        })}</div>}
        <div className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-slate-400"><Clock3 size={10} />{message.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  );
}

function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  if (!rows.length) return <div className="px-3 py-4 text-xs text-slate-400">查询没有返回数据行。</div>;
  return <table className="min-w-full border-collapse text-left text-[10px]"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr>{keys.map((key) => <th key={key} className="max-w-48 border-b border-slate-100 px-3 py-2 font-semibold">{key}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-slate-50 last:border-0">{keys.map((key) => <td key={key} className="max-w-48 truncate px-3 py-2 text-slate-600">{String(row[key] ?? "—")}</td>)}</tr>)}</tbody></table>;
}
