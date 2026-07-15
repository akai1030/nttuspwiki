import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * 後台閘門 — /console/* 一律需登入。未登入 → 導去 /login 並帶 next 回跳。
 * 只驗簽章 cookie（jose，edge-safe），不查 DB；角色細分交給頁面層 guard.ts。
 * 這是邊界防禦；頁面 requireUser/requireRole 仍會再擋一次（縱深防禦）。
 */
export async function middleware(req: NextRequest) {
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
  matcher: ["/console", "/console/:path*"],
};
