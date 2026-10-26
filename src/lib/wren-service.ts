import "server-only";

import type { DatabaseConnection, WrenQueryResult } from "@/lib/types";
import { decryptSecret } from "@/lib/secrets";

const SERVICE_URL = (process.env.WREN_SERVICE_URL || "http://127.0.0.1:8765").replace(/\/+$/, "");

async function callService<T>(path: string, body?: unknown, timeoutMs = 90_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SERVICE_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { detail?: string; error?: string };
    if (!response.ok) throw new Error(payload.detail || payload.error || `Wren 服务返回 ${response.status}`);
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Wren 服务处理超过 ${Math.round(timeoutMs / 1000)} 秒，请稍后重试`);
    if (error instanceof TypeError) throw new Error("无法连接本机 Wren 服务，请先按 README 启动 Python 查询服务");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncWrenProject(connection: DatabaseConnection) {
  return callService<{ ok: boolean; project: string; modelCount: number }>("/projects/sync", {
    id: connection.id,
    name: connection.name,
    dataSource: connection.engine ?? "mysql",
    host: connection.host,
    port: connection.port,
    database: connection.database,
    username: connection.username,
    password: connection.passwordEncrypted ? await decryptSecret(connection.passwordEncrypted) : "",
    databasePath: connection.databasePath ?? "",
    tables: connection.tables,
  }, 180_000);
}

export async function importJaffleShopSample() {
  return callService<{
    ok: boolean;
    id: string;
    name: string;
    dataSource: "duckdb";
    database: string;
    databasePath: string;
    tables: DatabaseConnection["tables"];
    project: string;
  }>("/projects/import-sample", {}, 180_000);
}

export async function runWrenQuery(connectionId: string, sql: string): Promise<WrenQueryResult> {
  return callService<WrenQueryResult>("/query", { connectionId, sql });
}

export async function deleteWrenProject(connectionId: string) {
  return callService<{ ok: boolean }>("/projects/delete", { id: connectionId });
}

export async function getWrenHealth() {
  return callService<{ ok: boolean; wrenAvailable: boolean; message: string }>("/health");
}
