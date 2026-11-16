/**
 * 會前提醒的發送規劃（純函式，不碰資料庫與網路；scripts/test-line.ts 直接測這裡）。
 *
 * 規則：
 *   1. 提醒時間以「會議時間 − 會前天數」當下重算，不用存著的 fireAt。
 *      改過會議時間的話，存著的 fireAt 是舊的（updateMeeting 不會跟著改）。
 *   2. 會議已經開始或開過的不發，留在後台顯示「未發：會議已開過」。
 *   3. 同一場會議同時有好幾則到期（排程停過、或提醒是事後才補加的），只發最接近開會的那一則，
 *      其他標成 skipped，免得群組一次收到三則同一場的提醒。
 *   4. 最接近的那則正在別支排程發送中（claimedAt 還沒過期）或已達重試上限，這一場這次就不發。
 */
import { createHash } from "node:crypto";
import { computeFireAt } from "@/lib/meetings/reminders";

/** 同一則提醒最多試幾次；到了就停，等後台按「重試」。 */
export const MAX_ATTEMPTS = 5;
/** 發送鎖的有效時間。程序在發送途中掛掉時，過了這段時間別支排程才能接手。 */
export const CLAIM_TTL_MS = 10 * 60 * 1000;

export type PlanRow = {
  id: string;
  meetingId: string;
  meetingAt: Date;
  offsetDays: number;
  attempts: number;
  claimedAt: Date | null;
};

export type Plan<T extends PlanRow> = { send: T[]; skip: T[] };

export function effectiveFireAt(r: Pick<PlanRow, "meetingAt" | "offsetDays">): Date {
  return computeFireAt(r.meetingAt, r.offsetDays);
}

export function isClaimLive(claimedAt: Date | null, now: Date): boolean {
  return claimedAt !== null && now.getTime() - claimedAt.getTime() < CLAIM_TTL_MS;
}

/** rows 只放 sentAt 為空的提醒。 */
export function planDispatch<T extends PlanRow>(rows: T[], now: Date): Plan<T> {
  const due = rows.filter((r) => r.meetingAt > now && effectiveFireAt(r) <= now);
  const byMeeting = new Map<string, T[]>();
  for (const r of due) {
    const list = byMeeting.get(r.meetingId) ?? [];
    list.push(r);
    byMeeting.set(r.meetingId, list);
  }
  const send: T[] = [];
  const skip: T[] = [];
  for (const list of byMeeting.values()) {
    // 會前天數小的最接近開會；天數一樣（重複加了同一個）取 id 小的，結果才固定。
    list.sort((a, b) => a.offsetDays - b.offsetDays || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const [primary, ...rest] = list;
    if (!isClaimLive(primary.claimedAt, now) && primary.attempts < MAX_ATTEMPTS) send.push(primary);
    for (const r of rest) if (!isClaimLive(r.claimedAt, now)) skip.push(r);
  }
  return { send, skip };
}

export type ReminderState =
  | "pending" // 還沒到時間
  | "due" // 到時間了，下次排程發
  | "retrying" // 失敗過，下次排程重試
  | "failed" // 達重試上限，停了
  | "sent" // 機器人發出
  | "manual" // 祕書處按了「標記已處理」
  | "skipped" // 同場有更接近開會的提醒一起到期，只發那一則
  | "missed"; // 會議已開過、沒發

export function reminderState(
  r: {
    offsetDays: number;
    sentAt: Date | null;
    sentVia: string | null;
    attempts: number;
    lastError: string | null;
  },
  meetingAt: Date,
  now: Date
): ReminderState {
  if (r.sentAt) return r.sentVia === "line" ? "sent" : r.sentVia === "skipped" ? "skipped" : "manual";
  if (meetingAt <= now) return "missed";
  if (r.attempts >= MAX_ATTEMPTS) return "failed";
  if (r.lastError) return "retrying";
  return effectiveFireAt({ meetingAt, offsetDays: r.offsetDays }) <= now ? "due" : "pending";
}

/**
 * X-Line-Retry-Key：同一則提醒發到同一個群組永遠算出同一把（24 小時內 LINE 認得）。
 * 上一次其實送達、只是沒收到回應，重送會得到 409，不會重複出現在群組。
 * 發成功後 lineRequestId 會寫入，之後若有人把它改回未處理要再發一次，算出來的就是新的一把。
 * 版面排成 UUID v4（LINE 只要求十六進位 UUID 格式）。
 */
export function retryKeyFor(reminderId: string, groupId: string, previousRequestId: string | null): string {
  const h = createHash("sha256")
    .update(`meeting-reminder:${reminderId}:${groupId}:${previousRequestId ?? ""}`)
    .digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** LINE 的 groupId：C 開頭加 32 位十六進位。不合格式的不存、不拿去組網址。 */
export function isLineGroupId(s: unknown): s is string {
  return typeof s === "string" && /^C[0-9a-f]{32}$/.test(s);
}
