import { after } from "next/server";
import { copy } from "@/lib/copy";
import { lineConfig } from "@/lib/line/config";
import { verifyLineSignature } from "@/lib/line/signature";
import { groupSummary, replyText } from "@/lib/line/client";
import { recordJoin, recordLeave, recordSeen, saveGroupName } from "@/lib/line/groups";
import { isLineGroupId } from "@/lib/line/plan";

// 驗簽要 node:crypto，寫資料庫要 Prisma：一律 Node runtime、不快取。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** LINE 一次送來的事件不會大到這樣；超過就不讀，免得被灌大檔。 */
const MAX_BODY_BYTES = 256 * 1024;

type LineEvent = {
  type?: unknown;
  replyToken?: unknown;
  source?: { type?: unknown; groupId?: unknown };
};

/**
 * POST /api/line/webhook — LINE Developers 的 Webhook URL 填這裡。
 *
 * 1. 沒設 LINE_CHANNEL_ACCESS_TOKEN／LINE_CHANNEL_SECRET → 404（整段關閉）。
 * 2. 先驗 x-line-signature，過了才 JSON.parse、才碰資料庫。驗不過回 401。
 * 3. 只看群組事件：join 記下群組並在群組裡回一句（reply 不計則數）、leave 記下被移出、
 *    其他事件（有人發言等）只在還沒記過這個群組時補記。對話內容與成員 userId 一律不存。
 * 4. 一律回 200（LINE 的「Verify」按鈕送的是空的 events，也要 200）；查群組名稱、回覆放到回應之後做。
 */
export async function POST(req: Request) {
  const cfg = lineConfig();
  if (!cfg) return new Response("Not Found", { status: 404 });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return new Response("Payload Too Large", { status: 413 });
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length > MAX_BODY_BYTES) return new Response("Payload Too Large", { status: 413 });

  if (!verifyLineSignature(raw, req.headers.get("x-line-signature"), cfg.secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const events: LineEvent[] = Array.isArray((body as { events?: unknown })?.events)
    ? ((body as { events: LineEvent[] }).events)
    : [];

  const now = new Date();
  const needName = new Set<string>();
  const welcome: string[] = [];

  for (const ev of events) {
    if (ev?.source?.type !== "group" || !isLineGroupId(ev.source.groupId)) continue;
    const groupId = ev.source.groupId;
    try {
      if (ev.type === "join") {
        await recordJoin(groupId, now);
        needName.add(groupId);
        if (typeof ev.replyToken === "string") welcome.push(ev.replyToken);
      } else if (ev.type === "leave") {
        await recordLeave(groupId, now);
      } else if (await recordSeen(groupId, now)) {
        needName.add(groupId);
      }
    } catch (e) {
      // 單一事件寫不進去不影響其他事件；回 200 免得 LINE 一直重送同一批。
      console.error("[line webhook] event failed", ev.type, e instanceof Error ? e.message : e);
    }
  }

  if (needName.size > 0 || welcome.length > 0) {
    after(async () => {
      for (const token of welcome) await replyText(cfg.token, token, copy.line.message.joined);
      for (const id of needName) await saveGroupName(id, await groupSummary(cfg.token, id));
    });
  }

  return Response.json({ ok: true });
}
