/**
 * 發送到期的會前提醒到選定的 LINE 群組。排程（/api/line/dispatch）與後台「立即發送到期提醒」共用。
 *
 * 不重發的做法（重跑、兩支排程同時跑都一樣）：
 *   1. 只挑 sentAt 為空的提醒；發完寫 sentAt，下次就不會再挑到。
 *   2. 發之前先「搶」：updateMany 帶 sentAt 為空、沒有有效鎖的條件寫入 claimedAt，
 *      影響 1 列才算搶到；兩支同時跑只有一支搶得到。
 *   3. 推播帶固定的 X-Line-Retry-Key（lib/line/plan.ts retryKeyFor）。送出後還沒寫入 sentAt 程序就掛了、
 *      或逾時沒收到回應，下次重送 LINE 會回 409，當成已送達寫入 sentAt，群組不會出現第二則。
 * 失敗（4xx、5xx、逾時）記 lastError、放掉鎖，下次排程重試；試滿 MAX_ATTEMPTS 次就停，等後台按「重試」。
 */
import { prisma } from "@/lib/db";
import { lineConfig, siteUrl } from "./config";
import { pushText } from "./client";
import { selectedGroup } from "./groups";
import { buildReminderText } from "./message";
import { CLAIM_TTL_MS, MAX_ATTEMPTS, effectiveFireAt, planDispatch, retryKeyFor } from "./plan";

export type DispatchResult =
  | { status: "disabled" }
  | { status: "no-group" }
  | { status: "done"; sent: number; skipped: number; failed: number; errors: string[] };

const ERROR_MAX = 300;

export async function dispatchDueReminders(now: Date = new Date()): Promise<DispatchResult> {
  const cfg = lineConfig();
  if (!cfg) return { status: "disabled" };
  const group = await selectedGroup();
  if (!group) return { status: "no-group" };

  const rows = await prisma.meetingReminder.findMany({
    where: { sentAt: null, meeting: { meetingAt: { gt: now } } },
    include: {
      meeting: {
        select: {
          id: true,
          slug: true,
          name: true,
          meetingAt: true,
          location: true,
          meetingUrl: true,
          proposalDeadline: true,
          isPublic: true,
        },
      },
    },
  });

  // 會議時間改過的，順手把存著的 fireAt 對齊（後台與舊畫面顯示用；發送判斷本來就用重算的時間）。
  for (const r of rows) {
    const eff = effectiveFireAt({ meetingAt: r.meeting.meetingAt, offsetDays: r.offsetDays });
    if (eff.getTime() !== r.fireAt.getTime()) {
      await prisma.meetingReminder.updateMany({ where: { id: r.id, sentAt: null }, data: { fireAt: eff } });
    }
  }

  const plan = planDispatch(
    rows.map((r) => ({ ...r, meetingAt: r.meeting.meetingAt })),
    now
  );

  let skipped = 0;
  for (const r of plan.skip) {
    const res = await prisma.meetingReminder.updateMany({
      where: { id: r.id, sentAt: null, OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - CLAIM_TTL_MS) } }] },
      data: { sentAt: now, sentVia: "skipped", claimedAt: null },
    });
    skipped += res.count;
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const r of plan.send) {
    const claim = await prisma.meetingReminder.updateMany({
      where: {
        id: r.id,
        sentAt: null,
        attempts: { lt: MAX_ATTEMPTS },
        OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - CLAIM_TTL_MS) } }],
      },
      data: { claimedAt: now, attempts: { increment: 1 } },
    });
    if (claim.count !== 1) continue; // 別支排程搶走了，或剛被標記處理

    const text = buildReminderText(r.meeting, new Date(), siteUrl());
    const res = await pushText(cfg.token, group.id, text, retryKeyFor(r.id, group.id, r.lineRequestId));

    if (res.ok || res.status === 409) {
      // updateMany：發送途中提醒被刪掉的話不丟 P2025，其他提醒照常處理。
      await prisma.meetingReminder.updateMany({
        where: { id: r.id },
        data: {
          sentAt: new Date(),
          sentVia: "line",
          claimedAt: null,
          lastError: null,
          lineRequestId: res.ok ? res.requestId : (res.acceptedRequestId ?? res.requestId),
        },
      });
      sent++;
    } else {
      const err = `${res.status || "—"} ${res.error}`.slice(0, ERROR_MAX);
      await prisma.meetingReminder.updateMany({
        where: { id: r.id },
        data: { claimedAt: null, lastError: err },
      });
      failed++;
      errors.push(err);
    }
  }

  return { status: "done", sent, skipped, failed, errors };
}
