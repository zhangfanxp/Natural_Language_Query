import "server-only";

import type { DatabaseConnection } from "@/lib/types";
import { importJaffleShopSample } from "@/lib/wren-service";
import { readConfiguration, writeConfiguration } from "@/lib/storage";

export const JAFFLE_SHOP_SAMPLE_ID = "sample-jaffle-shop";

export async function importJaffleShopDataSource() {
  const imported = await importJaffleShopSample();
  const configuration = await readConfiguration();
  const connection: DatabaseConnection = {
    id: imported.id,
    name: imported.name,
    engine: "duckdb",
    host: "",
    port: 0,
    database: imported.database,
    databasePath: imported.databasePath,
    username: "",
    passwordEncrypted: "",
    enabled: true,
    tables: imported.tables,
    updatedAt: new Date().toISOString(),
  };
  const exists = configuration.connections.some((item) => item.id === connection.id);
  const connections = exists
    ? configuration.connections.map((item) => item.id === connection.id ? connection : item)
    : [...configuration.connections, connection];
  await writeConfiguration({ ...configuration, connections });
  return { id: connection.id, name: connection.name, tableCount: connection.tables.length };
}
