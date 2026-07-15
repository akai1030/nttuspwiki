/**
 * 密碼雜湊 — 用 Node 內建 crypto.scrypt（零外部相依，符合 CLAUDE.md「勿上重型 auth 框架、維持精簡」）。
 * 儲存格式：`scrypt$<salt hex>$<hash hex>`。比對用 timingSafeEqual 防時序側漏。
 * 僅在 Node runtime 使用（登入 API、供裝腳本）；middleware（edge）不碰這裡。
 */
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LEN = 64;
const SALT_LEN = 16;

// NFKC 正規化：讓全形/半形、組合字在不同輸入法下一致，避免「看起來一樣卻雜湊不同」。
function norm(pw: string): string {
  return pw.normalize("NFKC");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = (await scryptAsync(norm(password), salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length === 0) return false;
  const key = (await scryptAsync(norm(password), salt, expected.length)) as Buffer;
  return key.length === expected.length && timingSafeEqual(key, expected);
}
