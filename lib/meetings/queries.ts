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

/**
 * 會議詳情。`key` 可為 slug 或舊 cuid（外流的 cuid 網址無法枚舉通知，故永久支援）。
 * slug.ts 的 validateSlug 已禁止 slug 長成 cuid 形，兩者不會互相誤命中。
 */
export function getMeetingByKey(key: string) {
  return prisma.meeting.findFirst({
    where: { OR: [{ slug: key }, { id: key }] },
    include: {
      proposals: { orderBy: [{ order: "asc" }, { serialNo: "asc" }] },
      notices: { orderBy: { createdAt: "desc" }, take: 5 },
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
export type MeetingDetail = NonNullable<Awaited<ReturnType<typeof getMeetingByKey>>>;

// ── 公開（免登入）：只回安全欄位，絕不含收件人/通知草稿/內部備註 ──

export function listPublicMeetings() {
  return prisma.meeting.findMany({
    where: { isPublic: true },
    orderBy: { meetingAt: "desc" },
    select: {
      id: true,
      slug: true,
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

/** 公開會議詳情。`key` 同上吃 slug 或舊 cuid；isPublic 白名單不變。 */
export function getPublicMeetingByKey(key: string) {
  return prisma.meeting.findFirst({
    where: { isPublic: true, OR: [{ slug: key }, { id: key }] },
    select: {
      id: true,
      slug: true,
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
      // 提案只露案由/分節/提案人/決議；不露說明與附件連結（可能未定/內部）。
      // resolution 刻意公開：0.0《組織章程》§27③ 以公告為決議案生效要件，
      // 且明定祕書處為備位公告機關 —— 決議本就應對外公開。仍受 isPublic 逐場控管。
      proposals: {
        orderBy: [{ order: "asc" }, { serialNo: "asc" }],
        select: {
          id: true,
          serialNo: true,
          section: true,
          title: true,
          proposer: true,
          resolution: true,
          order: true,
        },
      },
      milestones: { orderBy: { at: "asc" }, select: { id: true, title: true, at: true, note: true } },
      // 明確不選：notes（內部備註）、recipients、notices（郵件草稿）、createdById
    },
  });
}

export type PublicMeetingDetail = NonNullable<Awaited<ReturnType<typeof getPublicMeetingByKey>>>;
