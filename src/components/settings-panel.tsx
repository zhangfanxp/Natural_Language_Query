"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Database, FileText, KeyRound, LoaderCircle, Network, Plus, RefreshCw, Save, Server, Settings2, ShieldCheck, Trash2, Unplug, X } from "lucide-react";
import type { ColumnDefinition, CrossDatabaseRelationship, PublicConnection, TableDefinition } from "@/lib/types";

type SettingsResponse = {
  llm: null | { provider: string; baseUrl: string; model: string; configured: boolean };
  connections: PublicConnection[];
  relationships: CrossDatabaseRelationship[];
  businessRules: string;
};
type TabKey = "sources" | "dictionary" | "relationships" | "llm";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "sources", label: "数据源", icon: <Database size={16} /> },
  { key: "dictionary", label: "数据字典", icon: <FileText size={16} /> },
  { key: "relationships", label: "跨库关联", icon: <Network size={16} /> },
  { key: "llm", label: "LLM 设置", icon: <KeyRound size={16} /> },
];

export function SettingsPanel() {
  const [tab, setTab] = useState<TabKey>("sources");
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  async function refresh() {
    const response = await fetch("/api/settings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "无法加载系统设置");
    setSettings(data);
  }

  useEffect(() => { void refresh().catch((error) => setNotice({ kind: "error", text: error.message })); }, []);

  return <div className="animate-in">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#4169e1]"><Settings2 size={13} />Administration</div><h1 className="text-[26px] font-semibold tracking-tight text-slate-900 sm:text-[30px]">系统设置</h1><p className="mt-1.5 text-sm text-slate-500">连接企业数据、补充业务语义并配置模型服务。</p></div>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 panel-shadow"><ShieldCheck size={14} className="text-emerald-600" />管理员配置</div>
    </div>
    {notice && <div className={`mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.kind === "error" ? "border-rose-100 bg-rose-50 text-rose-700" : notice.kind === "info" ? "border-blue-100 bg-blue-50 text-blue-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}><CircleHelp size={16} className="mt-0.5 shrink-0" /><span className="flex-1">{notice.text}</span><button onClick={() => setNotice(null)} className="text-current/60 hover:text-current"><X size={14} /></button></div>}
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="h-fit rounded-[20px] border border-slate-200/80 bg-white p-2 panel-shadow">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition ${tab === item.key ? "bg-[#eef2ff] text-[#3459c3]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{item.icon}{item.label}{tab === item.key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#4169e1]" />}</button>)}
        <div className="mx-3 my-3 h-px bg-slate-100" /><div className="px-3 py-2 text-[10px] leading-5 text-slate-400">修改用户账号请编辑项目目录的 <code className="text-slate-500">user.json</code> 文件。</div>
      </nav>
      <div className="min-w-0">
        {!settings ? <PanelLoading /> : tab === "sources" ? <SourcesPanel settings={settings} refresh={refresh} setNotice={setNotice} busy={busy} setBusy={setBusy} /> : tab === "dictionary" ? <DictionaryPanel settings={settings} refresh={refresh} setNotice={setNotice} busy={busy} setBusy={setBusy} /> : tab === "relationships" ? <RelationshipsPanel settings={settings} refresh={refresh} setNotice={setNotice} busy={busy} setBusy={setBusy} /> : <LlmPanel settings={settings} refresh={refresh} setNotice={setNotice} busy={busy} setBusy={setBusy} />}
      </div>
    </div>
  </div>;
}

type PanelProps = { settings: SettingsResponse; refresh: () => Promise<void>; setNotice: (notice: { kind: "success" | "error" | "info"; text: string } | null) => void; busy: boolean; setBusy: (value: boolean) => void };

function PanelLoading() { return <div className="flex min-h-64 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-sm text-slate-400"><LoaderCircle size={17} className="mr-2 animate-spin" />正在加载配置…</div>; }

function SourcesPanel({ settings, refresh, setNotice, busy, setBusy }: PanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PublicConnection | null>(null);
  const [form, setForm] = useState({ name: "", host: "127.0.0.1", port: "3306", database: "", username: "", password: "" });
  const [tested, setTested] = useState(false);
  const hasSampleDatabase = settings.connections.some((connection) => connection.id === "sample-jaffle-shop");

  function startAdd() {
    setEditing(null); setTested(false); setForm({ name: "", host: "127.0.0.1", port: "3306", database: "", username: "", password: "" }); setShowForm(true);
  }
  function startEdit(connection: PublicConnection) {
    setEditing(connection); setTested(false); setForm({ name: connection.name, host: connection.host, port: String(connection.port), database: connection.database, username: connection.username, password: "" }); setShowForm(true);
  }
  function updateForm(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); setTested(false); }

  async function testConnection() {
    if (!form.password && editing?.hasPassword) {
      setNotice({ kind: "info", text: "保存时可以留空以保留现有密码；若要单独测试，请重新输入密码。" });
      return;
    }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/connections/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, port: Number(form.port) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "连接失败");
      setTested(true); setNotice({ kind: "success", text: `连接成功：${result.database} · ${result.version}` });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "连接失败" }); }
    finally { setBusy(false); }
  }

  async function saveConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, id: editing?.id, port: Number(form.port) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      await refresh(); setShowForm(false);
      setNotice(result.wren.ok ? { kind: "success", text: `${editing ? "数据源已更新" : "数据源已添加"}，并同步生成 ${result.tableCount} 张 Wren 模型。` } : { kind: "info", text: `MySQL 已保存并读取 ${result.tableCount} 张表；Wren 同步待完成：${result.wren.message || "查询服务尚未启动"}` });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(false); }
  }

  async function removeConnection(connection: PublicConnection) {
    if (!window.confirm(`确定删除数据源“${connection.name}”吗？关联规则也会一起删除。`)) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/connections/${connection.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "删除失败");
      await refresh(); setNotice({ kind: "success", text: `已删除 ${connection.name}` });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "删除失败" }); }
    finally { setBusy(false); }
  }

  async function importSampleDatabase() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/connections/import-sample", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入测试数据库失败");
      await refresh();
      setNotice({ kind: "success", text: `已导入 Jaffle Shop 测试数据库，读取 ${result.tableCount} 张表并同步 Wren 模型。` });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "导入测试数据库失败" }); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 panel-shadow">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-800">数据源</h2><p className="mt-1 text-xs leading-5 text-slate-400">连接 MySQL 业务数据库，或导入本机 DuckDB 示例库体验问数。</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void importSampleDatabase()} disabled={busy || hasSampleDatabase} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Database size={14} />{hasSampleDatabase ? "测试库已导入" : "导入测试数据库"}</button><button onClick={startAdd} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-3.5 text-xs font-semibold text-white hover:bg-[#345bd0]"><Plus size={15} />添加 MySQL</button></div></div>
      <div className="mt-5 space-y-3">
        {settings.connections.map((connection) => <div key={connection.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-[#fcfdff] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4169e1]"><Database size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-700">{connection.name}</span><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{connection.database}</span><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{connection.engine === "duckdb" ? "DuckDB 示例" : "MySQL"}</span></div><div className="mt-1 text-[11px] text-slate-400">{connection.engine === "duckdb" ? `本机数据库文件 · ${connection.tables.length} 张表` : `${connection.host}:${connection.port} · ${connection.tables.length} 张表 · 账号 ${connection.username}`}</div></div><span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />已连接</span>{connection.engine !== "duckdb" && <button onClick={() => startEdit(connection)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-white">编辑</button>}<button onClick={() => void removeConnection(connection)} disabled={busy} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="删除数据源"><Trash2 size={15} /></button></div>)}
        {settings.connections.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Unplug size={19} /></div><p className="mt-3 text-sm font-medium text-slate-600">还没有连接数据源</p><p className="mt-1 text-xs text-slate-400">可以连接业务 MySQL，也可以先导入 Jaffle Shop 示例数据库。</p><button onClick={() => void importSampleDatabase()} disabled={busy || hasSampleDatabase} className="mt-4 text-xs font-semibold text-blue-600 disabled:opacity-50">导入测试数据库 <span aria-hidden>→</span></button></div>}
      </div>
    </section>
    <section className="rounded-[20px] border border-blue-100 bg-[#f0f4ff] p-4"><div className="flex gap-3"><div className="mt-0.5 text-[#4169e1]"><CircleHelp size={16} /></div><div><div className="text-xs font-semibold text-slate-700">连接建议</div><p className="mt-1 text-[11px] leading-5 text-slate-500">请使用仅有读取权限的 MySQL 账号。跨库提问会分别访问相关数据源，再按下方配置的关联字段整合。</p></div></div></section>
    {showForm && <Modal title={editing ? "编辑 MySQL 数据源" : "添加 MySQL 数据源"} onClose={() => setShowForm(false)}>
      <form onSubmit={saveConnection} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="显示名称" value={form.name} onChange={(value) => updateForm("name", value)} placeholder="例如：OA 人事系统" required /><Field label="MySQL 主机" value={form.host} onChange={(value) => updateForm("host", value)} placeholder="192.168.1.20" required /><Field label="端口" value={form.port} onChange={(value) => updateForm("port", value)} placeholder="3306" required /><Field label="数据库名" value={form.database} onChange={(value) => updateForm("database", value)} placeholder="company_db" required /><Field label="数据库账号" value={form.username} onChange={(value) => updateForm("username", value)} placeholder="readonly_user" required /><Field label="数据库密码" value={form.password} onChange={(value) => updateForm("password", value)} placeholder={editing ? "留空保留原密码" : "输入连接密码"} type="password" required={!editing} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="max-w-sm text-[10px] leading-4 text-slate-400">保存时会验证连接、读取表结构并尝试同步 Wren 模型。凭据在服务器本地加密保存。</p><div className="flex gap-2"><button type="button" onClick={() => void testConnection()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13} className={busy ? "animate-spin" : ""} />测试连接</button><button type="submit" disabled={busy} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-4 text-xs font-semibold text-white hover:bg-[#345bd0] disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{editing ? "保存修改" : "连接并读取结构"}</button></div></div>
        {tested && <div className="text-xs text-emerald-700">连接测试通过</div>}
      </form>
    </Modal>}
  </div>;
}

function DictionaryPanel({ settings, refresh, setNotice, busy, setBusy }: PanelProps) {
  const [connectionId, setConnectionId] = useState(settings.connections[0]?.id || "");
  const connection = settings.connections.find((item) => item.id === connectionId);
  const [tableName, setTableName] = useState(connection?.tables[0]?.name || "");
  const [tables, setTables] = useState<TableDefinition[]>(connection?.tables || []);
  const activeTable = tables.find((table) => table.name === tableName);

  useEffect(() => {
    const next = settings.connections.find((item) => item.id === connectionId);
    setTables(next?.tables || []);
    setTableName(next?.tables[0]?.name || "");
  }, [connectionId, settings.connections]);

  function patchTable(name: string, patch: Partial<TableDefinition>) {
    setTables((current) => current.map((table) => table.name === name ? { ...table, ...patch } : table));
  }
  function patchColumn(table: string, columnName: string, patch: Partial<ColumnDefinition>) {
    setTables((current) => current.map((item) => item.name === table ? { ...item, columns: item.columns.map((column) => column.name === columnName ? { ...column, ...patch } : column) } : item));
  }

  async function saveDictionary() {
    if (!connection) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/connections/${connection.id}/metadata`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ tables }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      await refresh();
      setNotice(result.wrenWarning ? { kind: "info", text: `说明已保存，但 Wren 同步稍后重试：${result.wrenWarning}` } : { kind: "success", text: "数据字典已保存并同步到 Wren 语义项目。" });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(false); }
  }

  async function saveRules() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/settings/business-rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ businessRules: rules }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      await refresh(); setNotice({ kind: "success", text: "业务口径已保存。" });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(false); }
  }
  const [rules, setRules] = useState(settings.businessRules);
  useEffect(() => setRules(settings.businessRules), [settings.businessRules]);

  return <div className="space-y-5">
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 panel-shadow">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-800">表和字段说明</h2><p className="mt-1 text-xs leading-5 text-slate-400">结构从所选数据源自动读取；补充含义后，LLM 才能区分相似字段。</p></div><button onClick={() => void saveDictionary()} disabled={!connection || busy} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-3.5 text-xs font-semibold text-white hover:bg-[#345bd0] disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}保存数据字典</button></div>
      {settings.connections.length === 0 ? <EmptyState text="请先添加 MySQL 数据源或导入测试数据库。" /> : <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-100 bg-[#fafbfe] p-3"><label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">选择数据库</label><select value={connectionId} onChange={(event) => setConnectionId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-300">{settings.connections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="mb-2 mt-5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">数据表 · {tables.length}</label><div className="scrollbar-slim max-h-[440px] space-y-1 overflow-y-auto">{tables.map((table) => <button key={table.name} onClick={() => setTableName(table.name)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${tableName === table.name ? "bg-[#eaf0ff] font-medium text-[#3459c3]" : "text-slate-600 hover:bg-white"}`}><Database size={13} className="shrink-0" /><span className="truncate">{table.name}</span><span className="ml-auto text-[10px] text-slate-400">{table.columns.length}</span></button>)}</div></div>
        {activeTable ? <div className="min-w-0 rounded-2xl border border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-semibold text-slate-800">{activeTable.name}</div><div className="mt-1 text-[10px] text-slate-400">Wren 模型名：{activeTable.modelName}</div></div><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500">{activeTable.columns.length} 个字段</span></div><label className="mb-1.5 mt-4 block text-[11px] font-medium text-slate-600">数据表业务说明</label><input value={activeTable.description} onChange={(event) => patchTable(activeTable.name, { description: event.target.value })} placeholder="例如：销售订单主表，订单金额为含税金额" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-blue-300" /><div className="mt-5 space-y-2">{activeTable.columns.map((column) => <div key={column.name} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-700">{column.name}{column.primaryKey && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">主键</span>}</div><div className="mt-1 text-[10px] text-slate-400">{column.type}{column.nullable ? " · 可为空" : " · 非空"}</div></div><input value={column.description} onChange={(event) => patchColumn(activeTable.name, column.name, { description: event.target.value })} placeholder="补充业务含义，例如：销售负责人关联 OA 员工编号" className="h-9 min-w-0 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-300" /></div>)}</div></div> : <EmptyState text="该数据库没有可编辑的数据表。" />}
      </div>}
    </section>
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 panel-shadow"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FileText size={15} /></div><div><h2 className="text-sm font-semibold text-slate-800">企业业务口径</h2><p className="mt-0.5 text-[10px] text-slate-400">写下“销售业绩”“有效客户”等指标在企业里的具体定义。</p></div></div><textarea value={rules} onChange={(event) => setRules(event.target.value)} rows={5} placeholder={'示例：\n- 销售业绩按订单实付金额统计，不含已取消订单。\n- 上个月按 Asia/Shanghai 自然月计算。\n- 员工入职时长按入职日期计算至今天。'} className="mt-4 w-full resize-y rounded-xl border border-slate-200 p-3 text-xs leading-6 text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-300" /><div className="mt-3 flex justify-end"><button onClick={() => void saveRules()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Save size={13} />保存业务口径</button></div></section>
  </div>;
}

function RelationshipsPanel({ settings, refresh, setNotice, busy, setBusy }: PanelProps) {
  const [relationships, setRelationships] = useState(settings.relationships.map(({ id: _id, ...relationship }) => relationship));
  useEffect(() => setRelationships(settings.relationships.map(({ id: _id, ...relationship }) => relationship)), [settings.relationships]);
  const connections = settings.connections;
  const fieldOptions = (connectionId: string) => connections.find((connection) => connection.id === connectionId)?.tables.flatMap((table) => table.columns.map((column) => ({ value: `${table.name}.${column.name}`, label: `${table.name}.${column.name}` }))) ?? [];
  function addRelationship() {
    if (connections.length < 2) { setNotice({ kind: "info", text: "请先添加至少两套数据库，才能配置跨库关联。" }); return; }
    const left = connections[0]; const right = connections[1];
    setRelationships((current) => [...current, { name: "员工编号关联", leftConnectionId: left.id, leftTable: left.tables[0]?.name || "", leftColumn: left.tables[0]?.columns[0]?.name || "", rightConnectionId: right.id, rightTable: right.tables[0]?.name || "", rightColumn: right.tables[0]?.columns[0]?.name || "", description: "" }]);
  }
  function update(index: number, patch: Partial<(typeof relationships)[number]>) {
    setRelationships((current) => current.map((relationship, itemIndex) => itemIndex === index ? { ...relationship, ...patch } : relationship));
  }
  function chooseField(index: number, side: "left" | "right", value: string) {
    const [table, ...columnParts] = value.split(".");
    update(index, side === "left" ? { leftTable: table, leftColumn: columnParts.join(".") } : { rightTable: table, rightColumn: columnParts.join(".") });
  }
  async function save() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/settings/relationships", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ relationships }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      await refresh(); setNotice({ kind: "success", text: "跨库关联关系已保存。" });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(false); }
  }

  return <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 panel-shadow">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-slate-800">跨数据库关联</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">声明不同系统中哪些字段代表同一业务实体。系统将把这些映射交给查询规划器，避免只按姓名猜测匹配。</p></div><button onClick={addRelationship} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"><Plus size={14} />添加关联</button></div>
    {connections.length < 2 && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center"><Network size={22} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">添加第二个数据库后即可关联</p><p className="mt-1 text-xs text-slate-400">例如 OA 员工编号 ↔ 销售订单业务员编号。</p></div>}
    {connections.length >= 2 && relationships.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center"><Network size={22} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">还没有跨库关系</p><p className="mt-1 text-xs text-slate-400">先从员工编号等稳定的业务键开始关联。</p><button onClick={addRelationship} className="mt-3 text-xs font-semibold text-blue-600">创建第一条关联</button></div>}
    <div className="mt-5 space-y-4">{relationships.map((relationship, index) => {
      const leftOptions = fieldOptions(relationship.leftConnectionId); const rightOptions = fieldOptions(relationship.rightConnectionId);
      const leftValue = `${relationship.leftTable}.${relationship.leftColumn}`; const rightValue = `${relationship.rightTable}.${relationship.rightColumn}`;
      return <div key={index} className="rounded-2xl border border-slate-100 bg-[#fcfdff] p-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4169e1]"><Network size={15} /></div><div className="min-w-0 flex-1"><input value={relationship.name} onChange={(event) => update(index, { name: event.target.value })} className="h-8 w-full border-0 bg-transparent text-sm font-semibold text-slate-700 outline-none" placeholder="关系名称" /><div className="mt-3 grid gap-3 xl:grid-cols-[1fr_34px_1fr]"><RelationSide value={relationship.leftConnectionId} connections={connections} onConnection={(value) => update(index, { leftConnectionId: value, leftTable: "", leftColumn: "" })} fieldValue={leftValue} options={leftOptions} onField={(value) => chooseField(index, "left", value)} /><div className="hidden items-center justify-center text-slate-300 xl:flex">↔</div><RelationSide value={relationship.rightConnectionId} connections={connections} onConnection={(value) => update(index, { rightConnectionId: value, rightTable: "", rightColumn: "" })} fieldValue={rightValue} options={rightOptions} onField={(value) => chooseField(index, "right", value)} /></div><input value={relationship.description} onChange={(event) => update(index, { description: event.target.value })} className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-300" placeholder="关系说明，例如：销售系统使用工号关联 OA 员工档案" /></div><button onClick={() => setRelationships((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="删除关联"><Trash2 size={14} /></button></div></div>;
    })}</div>
    {relationships.length > 0 && <div className="mt-5 flex justify-end"><button onClick={() => void save()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-4 text-xs font-semibold text-white hover:bg-[#345bd0] disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}保存关联关系</button></div>}
  </section>;
}

function RelationSide({ value, connections, onConnection, fieldValue, options, onField }: { value: string; connections: PublicConnection[]; onConnection: (value: string) => void; fieldValue: string; options: { value: string; label: string }[]; onField: (value: string) => void }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">数据源</label><select value={value} onChange={(event) => onConnection(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-300">{connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}</select><label className="mb-1.5 mt-3 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">关联字段</label><select value={options.some((item) => item.value === fieldValue) ? fieldValue : ""} onChange={(event) => onField(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none focus:border-blue-300"><option value="">选择表和字段</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>;
}

function LlmPanel({ settings, refresh, setNotice, busy, setBusy }: PanelProps) {
  const [provider, setProvider] = useState(settings.llm?.provider || "阿里云百炼");
  const [baseUrl, setBaseUrl] = useState(settings.llm?.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1");
  const [model, setModel] = useState(settings.llm?.model || "qwen-plus");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(Boolean(settings.llm?.configured));
  useEffect(() => {
    if (!settings.llm) return;
    setProvider(settings.llm.provider); setBaseUrl(settings.llm.baseUrl); setModel(settings.llm.model); setHasKey(settings.llm.configured);
  }, [settings.llm]);

  function chooseProvider(value: string) {
    setProvider(value);
    if (value === "阿里云百炼") setBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
    if (value === "NVIDIA Build") setBaseUrl("https://integrate.api.nvidia.com/v1");
  }
  async function test() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/settings/llm/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ baseUrl, model, apiKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "连接测试失败");
      setNotice({ kind: "success", text: `LLM 连接成功：${result.response}` });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "连接测试失败" }); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/settings/llm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, baseUrl, model, apiKey }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      setApiKey(""); setHasKey(true); await refresh(); setNotice({ kind: "success", text: "LLM 配置已保存，API Key 已在服务器本地加密。" });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 panel-shadow">
      <div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e9f8f3] text-[#239e7d]"><KeyRound size={17} /></div><div><h2 className="text-base font-semibold text-slate-800">在线模型服务</h2><p className="mt-1 text-xs leading-5 text-slate-400">配置兼容 OpenAI Chat Completions 的 API，用于生成查询计划和自然语言答案。</p></div></div>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-[11px] font-medium text-slate-600">服务预设</label><select value={provider} onChange={(event) => chooseProvider(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-300"><option>阿里云百炼</option><option>NVIDIA Build</option><option>自定义 OpenAI 兼容接口</option></select></div><Field label="模型名称" value={model} onChange={setModel} placeholder="例如：qwen-plus" required /><div className="sm:col-span-2"><Field label="API Base URL" value={baseUrl} onChange={setBaseUrl} placeholder="https://.../v1" required /><p className="mt-1.5 text-[10px] leading-4 text-slate-400">百炼不同地域可使用不同地址；请按实际开通区域填写。NVIDIA Build 默认使用 integrate.api.nvidia.com。</p></div><div className="sm:col-span-2"><Field label="API Key" value={apiKey} onChange={setApiKey} type="password" placeholder={hasKey ? "已保存密钥；留空保持不变" : "粘贴 API Key"} required={!hasKey} /><p className="mt-1.5 text-[10px] text-slate-400">密钥只发送到本机服务端，并以 AES-GCM 加密保存。</p></div></div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => void test()} disabled={busy} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13} className={busy ? "animate-spin" : ""} />测试连接</button><button type="submit" disabled={busy} className="flex h-9 items-center gap-2 rounded-xl bg-[#4169e1] px-4 text-xs font-semibold text-white hover:bg-[#345bd0] disabled:opacity-50">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}保存模型配置</button></div>
      </form>
    </section>
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 panel-shadow"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Server size={16} /></div><div><div className="text-sm font-semibold text-slate-800">本机查询服务</div><div className="mt-0.5 text-[11px] text-slate-400">Wren Python SDK 通过回环地址运行，不对局域网客户端直接开放。</div></div><span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">由部署环境启动</span></div></section>
  </div>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <div><label className="mb-1.5 block text-[11px] font-medium text-slate-600">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-300 focus:ring-4 focus:ring-blue-50" /></div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14213a]/35 px-4 py-8 backdrop-blur-sm"><div className="scrollbar-slim max-h-full w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/80 bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><div className="mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-blue-600">Data connection</div><h3 className="text-lg font-semibold text-slate-800">{title}</h3></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭"><X size={17} /></button></div>{children}</div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">{text}</div>; }
