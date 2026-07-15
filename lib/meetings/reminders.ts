/**
 * 會前提醒推算 — 錨定會議時間往前推 offsetDays 天，得提醒觸發時間。
 * 站內看板先做；實際寄送（email 草稿/未來 cron）延續「只生草稿、人工送」原則。
 */
export function computeFireAt(meetingAt: Date, offsetDays: number): Date {
  return new Date(meetingAt.getTime() - offsetDays * 24 * 60 * 60 * 1000);
}

/** 常用提醒間隔（會前天數）。 */
export const DEFAULT_OFFSETS = [7, 3, 1] as const;
