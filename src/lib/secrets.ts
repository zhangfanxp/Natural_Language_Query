import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getMasterKey } from "@/lib/storage";

export async function encryptSecret(value: string): Promise<string> {
  if (!value) return "";
  const key = await getMasterKey(true);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export async function decryptSecret(value: string): Promise<string> {
  if (!value) return "";
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("受保护的配置无法解密，请在设置中重新保存凭据");
  }
  const decipher = createDecipheriv("aes-256-gcm", await getMasterKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
