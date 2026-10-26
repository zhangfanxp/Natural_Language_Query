import "server-only";

import { randomUUID } from "node:crypto";
import mysql, { type RowDataPacket } from "mysql2/promise";
import type { ColumnDefinition, TableDefinition } from "@/lib/types";

export interface MySqlInput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return /^[a-z]/.test(slug) ? slug : `m_${slug || randomUUID().slice(0, 8)}`;
}

export async function openMySqlConnection(input: MySqlInput) {
  return mysql.createConnection({
    host: input.host,
    port: input.port,
    database: input.database,
    user: input.username,
    password: input.password,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    decimalNumbers: false,
  });
}

export async function testMySqlConnection(input: MySqlInput) {
  const connection = await openMySqlConnection(input);
  try {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT VERSION() AS version, DATABASE() AS databaseName");
    return { version: String(rows[0]?.version ?? "MySQL"), database: String(rows[0]?.databaseName ?? input.database) };
  } finally {
    await connection.end();
  }
}

export async function discoverSchema(input: MySqlInput): Promise<TableDefinition[]> {
  const connection = await openMySqlConnection(input);
  try {
    const [tableRows] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName, TABLE_COMMENT AS tableComment
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
       ORDER BY TABLE_NAME`,
      [input.database],
    );
    const [columnRows] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType,
              IS_NULLABLE AS isNullable, COLUMN_KEY AS columnKey, COLUMN_COMMENT AS columnComment
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [input.database],
    );
    const [foreignKeyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName, CONSTRAINT_NAME AS constraintName, COLUMN_NAME AS columnName,
              REFERENCED_TABLE_NAME AS referencedTable, REFERENCED_COLUMN_NAME AS referencedColumn,
              ORDINAL_POSITION AS ordinalPosition
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION`,
      [input.database],
    );
    const columnsByTable = new Map<string, ColumnDefinition[]>();
    for (const column of columnRows) {
      const tableName = String(column.tableName);
      const columns = columnsByTable.get(tableName) ?? [];
      columns.push({
        name: String(column.columnName),
        type: String(column.dataType).toLowerCase(),
        nullable: column.isNullable === "YES",
        primaryKey: column.columnKey === "PRI",
        description: String(column.columnComment ?? ""),
        modelName: String(column.columnName),
      });
      columnsByTable.set(tableName, columns);
    }
    const foreignKeysByTable = new Map<string, Map<string, { name: string; columns: string[]; referencedTable: string; referencedColumns: string[] }>>();
    for (const foreignKey of foreignKeyRows) {
      const tableName = String(foreignKey.tableName);
      const constraintName = String(foreignKey.constraintName);
      const constraints = foreignKeysByTable.get(tableName) ?? new Map();
      const entry = constraints.get(constraintName) ?? {
        name: constraintName,
        columns: [],
        referencedTable: String(foreignKey.referencedTable),
        referencedColumns: [],
      };
      entry.columns.push(String(foreignKey.columnName));
      entry.referencedColumns.push(String(foreignKey.referencedColumn));
      constraints.set(constraintName, entry);
      foreignKeysByTable.set(tableName, constraints);
    }
    const usedModelNames = new Set<string>();
    return tableRows.map((table) => {
      const tableName = String(table.tableName);
      const baseModelName = slugify(tableName);
      let modelName = baseModelName;
      let suffix = 2;
      while (usedModelNames.has(modelName)) modelName = `${baseModelName}_${suffix++}`;
      usedModelNames.add(modelName);
      return {
        name: tableName,
        modelName,
        description: String(table.tableComment ?? ""),
        columns: columnsByTable.get(tableName) ?? [],
        foreignKeys: [...(foreignKeysByTable.get(tableName)?.values() ?? [])],
      };
    });
  } finally {
    await connection.end();
  }
}
