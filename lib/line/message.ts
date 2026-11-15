/**
 * 群組裡看到的提醒文字。字串在 lib/copy.ts 的 copy.line.message。
 * 時間一律臺北時間（lib/meetings/roc.ts），「N 天後開會」照臺北日曆日、以發送當下計算，
 * 排程晚了才發也不會寫錯天數。
 */
import { copy } from "@/lib/copy";
import { rocDateTimeFull, rocDeadline } from "@/lib/meetings/roc";
import { daysBetween } from "@/lib/meetings/timeline";

export type MeetingForLine = {
  id: string;
  slug: string | null;
  name: string;
  meetingAt: Date;
  location: string | null;
  meetingUrl: string | null;
  proposalDeadline: Date | null;
  isPublic: boolean;
};

export function buildReminderText(m: MeetingForLine, now: Date, site: string): string {
  const t = copy.line.message;
  const lines: string[] = [t.head(m.name), t.countdown(daysBetween(now, m.meetingAt)), ""];
  lines.push(`${t.when}${rocDateTimeFull(m.meetingAt)}`);
  if (m.location?.trim()) lines.push(`${t.where}${m.location.trim()}`);
  if (m.meetingUrl?.trim()) lines.push(`${t.link}${m.meetingUrl.trim()}`);
  if (m.proposalDeadline) {
    lines.push(`${t.deadline}${rocDeadline(m.proposalDeadline)}${m.proposalDeadline <= now ? t.closed : ""}`);
  }
  // 議事公開頁只有設為公開的會議才有；沒公開的不放連結（點了會是 404）。
  if (m.isPublic && site) lines.push(`${t.page}${site}/meetings/${m.slug ?? m.id}`);
  return lines.join("\n");
}
