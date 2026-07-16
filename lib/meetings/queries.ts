/**
 * 會議營運模組資料存取 — 幹部後台專用（呼叫端需已過 middleware / guard）。
 * 全走 Prisma 參數化查詢。
 */
import { prisma } from "@/lib/db";

export function listMeetings() {
  return prisma.meeting.findMany({
    orderBy: { meetingAt: "desc" },
    include: { _count: { select: { proposals: true, reminders: true, notices: true } } },
  });
}

export function getMeeting(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      proposals: { orderBy: [{ order: "asc" }, { serialNo: "asc" }] },
      notices: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { fireAt: "asc" } },
      milestones: { orderBy: { at: "asc" } },
    },
  });
}

export function listRecipients() {
  return prisma.recipient.findMany({
    orderBy: [{ active: "desc" }, { roleTag: "asc" }, { name: "asc" }],
  });
}

export function listActiveRecipients(session?: number) {
  return prisma.recipient.findMany({
    where: { active: true, ...(session ? { session } : {}) },
    orderBy: [{ roleTag: "asc" }, { name: "asc" }],
  });
}

/** 站內看板：未寄出且未來到期的提醒（含會議資訊）。 */
export function listUpcomingReminders(limit = 50) {
  return prisma.meetingReminder.findMany({
    where: { sentAt: null },
    orderBy: { fireAt: "asc" },
    take: limit,
    include: { meeting: { select: { id: true, name: true, meetingAt: true, session: true } } },
  });
}

export type MeetingWithCounts = Awaited<ReturnType<typeof listMeetings>>[number];
export type MeetingDetail = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;
