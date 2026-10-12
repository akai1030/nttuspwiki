/**
 * 登入後的回跳網址只接受站內路徑，擋開放重導。
 *
 * 只看開頭是 "/" 不夠：瀏覽器把 "/\evil.com" 的反斜線當成 "/"，"/\t/evil.com" 會先拿掉 tab，
 * 兩種都會被解析成 //evil.com（別的網域）。所以先擋反斜線與控制字元，
 * 再用 URL 解析確認結果還在同一個 origin。
 */
const FALLBACK = "/console";

export function safeNext(next?: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return FALLBACK;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return FALLBACK;
  try {
    const base = "http://localhost";
    if (new URL(next, base).origin !== base) return FALLBACK;
  } catch {
    return FALLBACK;
  }
  return next;
}
