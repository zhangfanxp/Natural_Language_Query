import "server-only";

import { randomUUID } from "node:crypto";
import type {
  ApplicationConfiguration,
  CrossDatabaseRelationship,
  DatabaseConnection,
  LlmConfiguration,
  PublicConnection,
} from "@/lib/types";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { readConfiguration, writeConfiguration } from "@/lib/storage";

export async function getPublicConfiguration() {
  const configuration = await readConfiguration();
  const connections: PublicConnection[] = configuration.connections.map((connection) => {
    const { passwordEncrypted, ...publicConnection } = connection;
    delete publicConnection.databasePath;
    return { ...publicConnection, hasPassword: Boolean(passwordEncrypted) };
  });
  return {
    version: configuration.version,
    llm: configuration.llm ? {
      provider: configuration.llm.provider,
      baseUrl: configuration.llm.baseUrl,
      model: configuration.llm.model,
      configured: Boolean(configuration.llm.apiKeyEncrypted),
    } : null,
    connections,
    relationships: configuration.relationships,
    businessRules: configuration.businessRules,
    updatedAt: configuration.updatedAt,
  };
}

export async function saveLlmConfiguration(input: {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
}) {
  const current = await readConfiguration();
  const apiKeyEncrypted = input.apiKey?.trim()
    ? await encryptSecret(input.apiKey.trim())
    : current.llm?.apiKeyEncrypted ?? "";
  if (!apiKeyEncrypted) throw new Error("请填写 LLM API Key");
  const llm: LlmConfiguration = {
    provider: input.provider.trim() || "OpenAI 兼容",
    baseUrl: input.baseUrl.trim().replace(/\/+$/, ""),
    model: input.model.trim(),
    apiKeyEncrypted,
  };
  await writeConfiguration({ ...current, llm });
}

export async function getLlmCredentials() {
  const configuration = await readConfiguration();
  if (!configuration.llm?.baseUrl || !configuration.llm.model || !configuration.llm.apiKeyEncrypted) {
    throw new Error("请先在系统设置中填写 LLM 地址、模型和 API Key");
  }
  return { ...configuration.llm, apiKey: await decryptSecret(configuration.llm.apiKeyEncrypted) };
}

export async function saveBusinessRules(businessRules: string) {
  const current = await readConfiguration();
  await writeConfiguration({ ...current, businessRules: businessRules.trim() });
}

export async function upsertConnection(input: Omit<DatabaseConnection, "passwordEncrypted" | "updatedAt"> & {
  password?: string;
}) {
  const current = await readConfiguration();
  const existing = current.connections.find((connection) => connection.id === input.id);
  const { password, ...connectionInput } = input;
  const passwordEncrypted = password?.trim()
    ? await encryptSecret(password.trim())
    : existing?.passwordEncrypted;
  if (!passwordEncrypted) throw new Error("请输入 MySQL 密码");
  const connection: DatabaseConnection = {
    ...connectionInput,
    passwordEncrypted,
    enabled: input.enabled ?? true,
    updatedAt: new Date().toISOString(),
  };
  const connections = existing
    ? current.connections.map((item) => item.id === connection.id ? connection : item)
    : [...current.connections, connection];
  await writeConfiguration({ ...current, connections });
  return connection;
}

export async function getConnectionWithPassword(id: string) {
  const configuration = await readConfiguration();
  const connection = configuration.connections.find((item) => item.id === id);
  if (!connection) throw new Error("找不到指定的数据源");
  return { ...connection, password: connection.passwordEncrypted ? await decryptSecret(connection.passwordEncrypted) : "" };
}

export async function deleteConnection(id: string) {
  const current = await readConfiguration();
  const connections = current.connections.filter((connection) => connection.id !== id);
  if (connections.length === current.connections.length) throw new Error("找不到指定的数据源");
  const relationships = current.relationships.filter((relationship) =>
    relationship.leftConnectionId !== id && relationship.rightConnectionId !== id,
  );
  await writeConfiguration({ ...current, connections, relationships });
}

export async function updateConnectionMetadata(id: string, tables: DatabaseConnection["tables"]) {
  const current = await readConfiguration();
  let found = false;
  const connections = current.connections.map((connection) => {
    if (connection.id !== id) return connection;
    found = true;
    return { ...connection, tables, updatedAt: new Date().toISOString() };
  });
  if (!found) throw new Error("找不到指定的数据源");
  await writeConfiguration({ ...current, connections });
}

export async function replaceRelationships(relationships: Omit<CrossDatabaseRelationship, "id">[]) {
  const current = await readConfiguration();
  const nextRelationships: CrossDatabaseRelationship[] = relationships.map((relationship) => ({
    ...relationship,
    id: randomUUID(),
  }));
  const connectionIds = new Set(current.connections.map((connection) => connection.id));
  for (const relationship of nextRelationships) {
    if (!connectionIds.has(relationship.leftConnectionId) || !connectionIds.has(relationship.rightConnectionId)) {
      throw new Error("关联关系引用了不存在的数据源");
    }
    if (relationship.leftConnectionId === relationship.rightConnectionId) {
      throw new Error("跨库关联需要选择两个不同的数据源");
    }
    const left = current.connections.find((connection) => connection.id === relationship.leftConnectionId);
    const right = current.connections.find((connection) => connection.id === relationship.rightConnectionId);
    const leftColumnExists = left?.tables.find((table) => table.name === relationship.leftTable)?.columns.some((column) => column.name === relationship.leftColumn);
    const rightColumnExists = right?.tables.find((table) => table.name === relationship.rightTable)?.columns.some((column) => column.name === relationship.rightColumn);
    if (!leftColumnExists || !rightColumnExists) throw new Error(`关联“${relationship.name}”中选择的表或字段不存在`);
  }
  await writeConfiguration({ ...current, relationships: nextRelationships });
}

export async function getConfiguration(): Promise<ApplicationConfiguration> {
  return readConfiguration();
}

export async function updateConnection(id: string, updater: (connection: DatabaseConnection) => DatabaseConnection) {
  const current = await readConfiguration();
  let found = false;
  const connections = current.connections.map((connection) => {
    if (connection.id !== id) return connection;
    found = true;
    return updater(connection);
  });
  if (!found) throw new Error("找不到指定的数据源");
  await writeConfiguration({ ...current, connections });
}
