import { cronSecret } from "@/lib/line/config";
import { bearerToken, safeEqual } from "@/lib/line/signature";
import { dispatchDueReminders } from "@/lib/line/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/line/dispatch — 排程呼叫，發送到期的會前提醒。
 * 標頭 Authorization: Bearer <LINE_CRON_SECRET>。密鑰沒設（或短於 16 字）→ 404，整支關閉。
 * Coolify 的排程任務跑 `node scripts/line-dispatch.mjs`，從容器內部打 127.0.0.1。
 * 重跑不重發：見 lib/line/dispatch.ts 檔頭。
 */
export async function POST(req: Request) {
  const secret = cronSecret();
  if (!secret) return new Response("Not Found", { status: 404 });
  if (!safeEqual(bearerToken(req.headers.get("authorization")), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await dispatchDueReminders();
  return Response.json(result);
}
