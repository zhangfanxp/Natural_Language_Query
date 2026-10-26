import "server-only";

import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ApplicationConfiguration, UserRecord } from "@/lib/types";

const ROOT = process.cwd();
export const DATA_DIRECTORY = path.join(ROOT, "data");
export const USER_FILE = path.join(ROOT, "user.json");
export const CONFIG_FILE = path.join(DATA_DIRECTORY, "app-config.json");
export const MASTER_KEY_FILE = path.join(DATA_DIRECTORY, "master.key");

export const emptyConfiguration = (): ApplicationConfiguration => ({
  version: 1,
  llm: null,
  connections: [],
  relationships: [],
  businessRules: "",
  updatedAt: new Date().toISOString(),
});

async function ensureDataDirectory() {
  await mkdir(DATA_DIRECTORY, { recursive: true, mode: 0o700 });
  await chmod(DATA_DIRECTORY, 0o700).catch(() => undefined);
}

async function writePrivateFile(filePath: string, value: string) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporaryPath, value, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o600).catch(() => undefined);
}

export async function readUsers(): Promise<UserRecord[] | null> {
  try {
    const parsed = JSON.parse(await readFile(USER_FILE, "utf8")) as { users?: UserRecord[] };
    return Array.isArray(parsed.users) ? parsed.users : null;
  } catch {
    return null;
  }
}

export async function writeUsers(users: UserRecord[]) {
  const payload = JSON.stringify({ version: 1, users }, null, 2);
  await writePrivateFile(USER_FILE, `${payload}\n`);
}

export async function isSetupComplete() {
  return (await readUsers()) !== null;
}

export async function readConfiguration(): Promise<ApplicationConfiguration> {
  try {
    const raw = JSON.parse(await readFile(CONFIG_FILE, "utf8")) as Partial<ApplicationConfiguration>;
    return {
      ...emptyConfiguration(),
      ...raw,
      connections: Array.isArray(raw.connections) ? raw.connections : [],
      relationships: Array.isArray(raw.relationships) ? raw.relationships : [],
    };
  } catch {
    return emptyConfiguration();
  }
}

export async function writeConfiguration(configuration: ApplicationConfiguration) {
  await ensureDataDirectory();
  await writePrivateFile(CONFIG_FILE, `${JSON.stringify({ ...configuration, updatedAt: new Date().toISOString() }, null, 2)}\n`);
}

export async function getMasterKey(create = false): Promise<Buffer> {
  await ensureDataDirectory();
  let encoded: string;
  try {
    encoded = await readFile(MASTER_KEY_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !create) {
      throw new Error("应用密钥文件不存在或无法读取");
    }
    const key = randomBytes(32);
    await writePrivateFile(MASTER_KEY_FILE, key.toString("base64"));
    return key;
  }
  const key = Buffer.from(encoded.trim(), "base64");
  if (key.length !== 32) throw new Error("应用密钥文件格式无效");
  return key;
}
