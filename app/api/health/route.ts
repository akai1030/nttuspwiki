import { NextResponse } from "next/server";
import { BUILD_TIME } from "@/lib/version";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — 健康檢查。只回 ok 與建置時間，不查資料庫。
 * 不回 commit：repo 公開，commit 對得回確切的套件版本。
 */
export function GET() {
  return NextResponse.json({ ok: true, built: BUILD_TIME }, { headers: { "Cache-Control": "no-store" } });
}
