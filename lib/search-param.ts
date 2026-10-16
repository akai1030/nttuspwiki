/**
 * 頁面 searchParams 的單一值。網址同一個參數出現兩次（?q=a&q=b）時 Next 給的是陣列，
 * 直接 .trim()／.startsWith() 會丟例外變成 500，所以一律先取第一個字串。
 */
export function firstParam(v: string | string[] | undefined | null): string {
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}

/**
 * 搜尋字數上限。公開端點、不用登入，不設上限的話一個幾千字的網址就會讓 jieba 斷詞與
 * tsquery 跟著變大（OR 退路還會掃更多列）。條文查詢實際用不到這麼長。
 */
export const MAX_QUERY_CHARS = 100;

export function clampQuery(q: string): string {
  return q.slice(0, MAX_QUERY_CHARS);
}

/**
 * /api/search 的 limit。小數直接丟進 SQL LIMIT 會被 Postgres 四捨五入（0.5 → 0 筆、2.7 → 3 筆），
 * 跟後面 .slice() 的截斷又對不上，所以先取整數；不到 1 或不是數字就用預設值，上限 100。
 */
export function parseLimit(raw: string | null, fallback = 30, max = 100): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
}
