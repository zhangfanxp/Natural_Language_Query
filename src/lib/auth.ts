import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getMasterKey, readUsers } from "@/lib/storage";
import type { UserRecord, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "wren_session";
const SESSION_SECONDS = 60 * 60 * 12;
const SCRYPT_N = 16_384;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${SCRYPT_N}$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  try {
    const [algorithm, nValue, rValue, pValue, saltValue, hashValue] = passwordHash.split("$");
    if (algorithm !== "scrypt" || !nValue || !rValue || !pValue || !saltValue || !hashValue) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(nValue), r: Number(rValue), p: Number(pValue), maxmem: 64 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function signature(value: string, key: Buffer) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

export async function createSessionToken(user: Pick<UserRecord, "username" | "role">) {
  const payload = Buffer.from(JSON.stringify({
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  })).toString("base64url");
  const key = await getMasterKey();
  return `${payload}.${signature(payload, key)}`;
}

export async function readSessionToken(token: string | undefined): Promise<{ username: string; role: UserRole } | null> {
  if (!token) return null;
  const [payload, receivedSignature] = token.split(".");
  if (!payload || !receivedSignature) return null;
  try {
    const key = await getMasterKey();
    const expected = Buffer.from(signature(payload, key));
    const received = Buffer.from(receivedSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: string; role?: UserRole; expiresAt?: number;
    };
    if (!decoded.username || !decoded.expiresAt || decoded.expiresAt < Date.now()) return null;
    if (decoded.role !== "admin" && decoded.role !== "user") return null;
    return { username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = await readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const users = await readUsers();
  const user = users?.find((entry) => entry.username === session.username && entry.enabled);
  if (!user || user.role !== session.role) return null;
  return session;
}

export async function requireSession(role?: "admin") {
  const session = await getSession();
  if (!session) throw new Error("请先登录");
  if (role === "admin" && session.role !== "admin") throw new Error("只有管理员可以执行此操作");
  return session;
}

export const SESSION_MAX_AGE = SESSION_SECONDS;
