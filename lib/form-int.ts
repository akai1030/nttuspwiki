/**
 * 表單整數欄位的解析（後台 server action 用）。
 * Postgres 的 Int 是 32 位元；超出範圍 Prisma 會丟錯變 500，所以超出的當成沒填、回 fallback。
 */
export const INT_MAX = 2147483647;

export function parseIntField(raw: string, fallback = 0): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && Math.abs(n) <= INT_MAX ? n : fallback;
}
