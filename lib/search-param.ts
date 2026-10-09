/**
 * 頁面 searchParams 的單一值。網址同一個參數出現兩次（?q=a&q=b）時 Next 給的是陣列，
 * 直接 .trim()／.startsWith() 會丟例外變成 500，所以一律先取第一個字串。
 */
export function firstParam(v: string | string[] | undefined | null): string {
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : "";
  return typeof v === "string" ? v : "";
}
