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

// ── 公開（免登入）：只回安全欄位，絕不含收件人/通知草稿/內部備註 ──

export function listPublicMeetings() {
  return prisma.meeting.findMany({
    where: { isPublic: true },
    orderBy: { meetingAt: "desc" },
    select: {
      id: true,
      session: true,
      academicYear: true,
      name: true,
      kind: true,
      meetingAt: true,
      location: true,
      status: true,
    },
  });
}

export function getPublicMeeting(id: string) {
  return prisma.meeting.findFirst({
    where: { id, isPublic: true },
    select: {
      id: true,
      session: true,
      academicYear: true,
      name: true,
      kind: true,
      meetingAt: true,
      location: true,
      meetingUrl: true,
      docNumber: true,
      proposalDeadline: true,
      status: true,
      // 提案只露案由/分節/提案人；不露說明與附件連結（可能未定/內部）
      proposals: {
        orderBy: [{ order: "asc" }, { serialNo: "asc" }],
        select: { id: true, serialNo: true, section: true, title: true, proposer: true, order: true },
      },
      milestones: { orderBy: { at: "asc" }, select: { id: true, title: true, at: true, note: true } },
      // 明確不選：notes（內部備註）、recipients、notices（郵件草稿）、createdById
    },
  });
}

export type PublicMeetingDetail = NonNullable<Awaited<ReturnType<typeof getPublicMeeting>>>;
