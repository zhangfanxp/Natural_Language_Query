export type UserRole = "admin" | "user";

export interface UserRecord {
  username: string;
  passwordHash: string;
  role: UserRole;
  enabled: boolean;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  description: string;
  modelName: string;
}

export interface TableDefinition {
  name: string;
  modelName: string;
  description: string;
  columns: ColumnDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
}

export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

export interface DatabaseConnection {
  id: string;
  name: string;
  engine?: "mysql" | "duckdb";
  host: string;
  port: number;
  database: string;
  databasePath?: string;
  username: string;
  passwordEncrypted: string;
  enabled: boolean;
  tables: TableDefinition[];
  updatedAt: string;
}

export interface CrossDatabaseRelationship {
  id: string;
  name: string;
  leftConnectionId: string;
  leftTable: string;
  leftColumn: string;
  rightConnectionId: string;
  rightTable: string;
  rightColumn: string;
  description: string;
}

export interface LlmConfiguration {
  provider: string;
  baseUrl: string;
  model: string;
  apiKeyEncrypted: string;
}

export interface ApplicationConfiguration {
  version: 1;
  llm: LlmConfiguration | null;
  connections: DatabaseConnection[];
  relationships: CrossDatabaseRelationship[];
  businessRules: string;
  updatedAt: string;
}

export interface PublicConnection extends Omit<DatabaseConnection, "passwordEncrypted" | "databasePath"> {
  hasPassword: boolean;
}

export interface WrenQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  expandedSql?: string;
  truncated: boolean;
}
