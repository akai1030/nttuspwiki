import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * /ingest/*（PostHog 轉送，見 next.config.mjs 的 rewrites）：不驗登入，只拿掉兩個標頭再放行。
 *   - cookie：Next 的 rewrite 會把瀏覽器帶來的標頭原封不動轉給 PostHog，
 *     同網域的請求會帶上幹部的 nttusp_session 與議員的 nttusp_voter（投票憑證）。憑證不能出站。
 *   - referer：同網域請求帶的是完整網址。
 * IP（x-forwarded-for）與 User-Agent 照轉，PostHog 用來推估大略地區。
 */
function stripForIngest(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("referer");
  return NextResponse.next({ request: { headers } });
}

/**
 * 後台閘門 — /console/* 一律需登入。（Next 16 起 middleware.ts 改名 proxy.ts，行為相同。）未登入 → 導去 /login 並帶 next 回跳。
 * 只驗簽章 cookie（jose，edge-safe），不查 DB；角色細分交給頁面層 guard.ts。
 * 這是邊界防禦；頁面 requireUser/requireRole 仍會再擋一次（縱深防禦）。
 */
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/ingest/")) return stripForIngest(req);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/console", "/console/:path*", "/ingest/:path*"],
};
