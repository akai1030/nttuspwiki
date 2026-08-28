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

/**
 * 現場議事頁（與會人用，免登入）。
 * 只有主席／祕書按下「開啟現場議事」後才查得到；關掉即刻消失。
 *
 * 白名單同 getPublicMeetingByKey 的精神：不露收件人、通知草稿、內部備註、建立者。
 * 提案只露議程上本來就會印的欄位（案由／分節／提案人／說明／決議），
 * 說明在此露出是因為主席宣讀議案時與會人需要跟著看 —— 這比公開頁多一項，
 * 但現場議事頁本來就是給與會人的，且僅在會議進行中開啟。
 */
export function getLiveMeetingByKey(key: string) {
  return prisma.meeting.findFirst({
    where: { liveOpen: true, OR: [{ slug: key }, { id: key }] },
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
      liveOpen: true,
      liveProposalId: true,
      livePresent: true,
      liveTotal: true,
      liveTotalBasis: true,
      liveNote: true,
      liveUpdatedAt: true,
      proposals: {
        where: { reviewStatus: { not: "rejected" } },
        orderBy: [{ order: "asc" }, { serialNo: "asc" }],
        select: {
          id: true,
          serialNo: true,
          section: true,
          title: true,
          proposer: true,
          explanation: true,
          resolution: true,
          matterType: true,
          order: true,
        },
      },
      // 明確不選：meetingUrl（連結只發給收件人，公開等於繞過身分控管）、
      // notes、docNumber、recipients、notices、createdById
    },
  });
}

export type LiveMeeting = NonNullable<Awaited<ReturnType<typeof getLiveMeetingByKey>>>;

/**
 * 建立新會議時的預設值來源：最近一場會議的「不太會變」欄位。
 * 只取屆別與地點 —— 會議名稱、連結、文號、時間每場都不同，沿用反而會出錯
 * （尤其會議連結：帶錯房號的開會通知寄出去就收不回來了）。
 */
export function latestMeetingDefaults() {
  return prisma.meeting.findFirst({
    orderBy: { meetingAt: "desc" },
    select: { session: true, location: true },
  });
}
