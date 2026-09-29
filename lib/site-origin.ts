import { headers } from "next/headers";

/**
 * 目前這次請求的網站根網址（https://nttuspcodex.zeabur.app），給要寄出去的絕對連結用。
 * 只在需登入的後台頁使用：Host 來自祕書處自己的瀏覽器請求，外人無從竄改。
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
