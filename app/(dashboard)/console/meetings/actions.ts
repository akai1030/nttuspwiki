"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth/guard";
import { parseTaipeiLocal } from "@/lib/meetings/roc";
import { generateNotice, type NoticeKind, type MeetingForNotice } from "@/lib/meetings/notice";
import { computeFireAt } from "@/lib/meetings/reminders";
import { buildMeetingSlug, normalizeSlug, pickAvailableSlug, validateSlug } from "@/lib/meetings/slug";

// —— FormData 小工具 ——
function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function optStr(fd: FormData, k: string): string | null {
  const v = str(fd, k);
  return v === "" ? null : v;
}
function int(fd: FormData, k: string, fallback = 0): number {
  const n = Number(str(fd, k));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** 目前已被占用的 slug（可排除自己，供編輯時檢查）。 */
async function takenSlugs(exceptId?: string): Promise<Set<string>> {
  const rows = await prisma.meeting.findMany({
    where: exceptId ? { NOT: { id: exceptId } } : undefined,
    select: { slug: true },
  });
  return new Set(rows.map((r) => r.slug).filter((x): x is string => Boolean(x)));
}

// 路由已改以 slug 為鍵，逐筆 revalidate 需先查 slug；改用路由樣板一次失效整條動態路由。
// 會議數量是數十筆等級，成本可忽略，且不會因為忘了查 slug 而失效到錯的路徑。
function revalidateMeetingRoutes() {
  revalidatePath("/console/meetings");
  revalidatePath("/console/meetings/[slug]", "page");
  revalidatePath("/meetings");
  revalidatePath("/meetings/[slug]", "page");
}

// —— 會議 ——
export async function createMeeting(fd: FormData) {
  const user = await requireUser();
  const session = int(fd, "session");
  const academicYear = str(fd, "academicYear");
  const name = str(fd, "name");
  const meetingAt = parseTaipeiLocal(str(fd, "meetingAt"));
  if (!session || !academicYear || !name || !meetingAt) {
    redirect("/console/meetings/new?error=1");
  }
  const kindRaw = str(fd, "kind");
  const kind = (["REGULAR", "SPECIAL", "COMMITTEE"] as const).includes(kindRaw as never)
    ? (kindRaw as "REGULAR" | "SPECIAL" | "COMMITTEE")
    : "REGULAR";
  const deadline = parseTaipeiLocal(str(fd, "proposalDeadline"));
  const slug = pickAvailableSlug(
    buildMeetingSlug({ session, academicYear, kind, meetingAt: meetingAt! }),
    await takenSlugs()
  );

  const m = await prisma.meeting.create({
    data: {
      slug,
      session,
      academicYear,
      name,
      kind,
      meetingAt: meetingAt!,
      location: optStr(fd, "location"),
      meetingUrl: optStr(fd, "meetingUrl"),
      docNumber: optStr(fd, "docNumber"),
      proposalDeadline: deadline,
      notes: optStr(fd, "notes"),
      createdById: user.sub,
    },
  });
  redirect(`/console/meetings/${m.slug ?? m.id}`);
}

export async function updateMeeting(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingAt = parseTaipeiLocal(str(fd, "meetingAt"));
  if (!id || !meetingAt) redirect(`/console/meetings/${id}/edit?error=1`);
  const kindRaw = str(fd, "kind");
  const kind = (["REGULAR", "SPECIAL", "COMMITTEE"] as const).includes(kindRaw as never)
    ? (kindRaw as "REGULAR" | "SPECIAL" | "COMMITTEE")
    : "REGULAR";
  // 網址可手動改；空白＝維持原值。不合法或撞名一律退回編輯頁，不靜默改成別的字串。
  const slugRaw = str(fd, "slug");
  let slug: string | undefined;
  if (slugRaw) {
    slug = normalizeSlug(slugRaw);
    if (validateSlug(slug) !== null) redirect(`/console/meetings/${id}/edit?error=slug`);
    if ((await takenSlugs(id)).has(slug)) redirect(`/console/meetings/${id}/edit?error=slugTaken`);
  }

  await prisma.meeting.update({
    where: { id },
    data: {
      ...(slug ? { slug } : {}),
      session: int(fd, "session"),
      academicYear: str(fd, "academicYear"),
      name: str(fd, "name"),
      kind,
      meetingAt: meetingAt!,
      location: optStr(fd, "location"),
      meetingUrl: optStr(fd, "meetingUrl"),
      docNumber: optStr(fd, "docNumber"),
      proposalDeadline: parseTaipeiLocal(str(fd, "proposalDeadline")),
      notes: optStr(fd, "notes"),
    },
  });
  redirect(`/console/meetings/${slug ?? id}`);
}

export async function toggleMeetingPublic(fd: FormData) {
  // 對外公開整場會議＝擴大公開範圍，限 admin（對齊 schema.prisma Meeting.isPublic 註解）。
  await requireAdmin();
  const id = str(fd, "id");
  if (!id) return;
  const m = await prisma.meeting.findUnique({ where: { id }, select: { isPublic: true } });
  if (!m) return;
  await prisma.meeting.update({ where: { id }, data: { isPublic: !m.isPublic } });
  revalidateMeetingRoutes();
}

export async function setMeetingStatus(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const statusRaw = str(fd, "status");
  const ok = (["DRAFT", "NOTICED", "HELD", "CLOSED"] as const).includes(statusRaw as never);
  if (id && ok) {
    await prisma.meeting.update({ where: { id }, data: { status: statusRaw as never } });
    revalidateMeetingRoutes();
  }
}

// —— 提案 ——
export async function addProposal(fd: FormData) {
  await requireUser();
  const meetingId = str(fd, "meetingId");
  const title = str(fd, "title");
  if (!meetingId || !title) return;
  await prisma.proposal.create({
    data: {
      meetingId,
      serialNo: int(fd, "serialNo", 0),
      section: str(fd, "section") || "討論事項",
      title,
      proposer: optStr(fd, "proposer"),
      explanation: optStr(fd, "explanation"),
      fileUrl: optStr(fd, "fileUrl"),
      order: int(fd, "order", 0),
    },
  });
  revalidateMeetingRoutes();
}

/**
 * 更新提案決議（會後補）。
 * 《國立臺東大學學生會組織章程》第 27 條第 3 款：會長應於收到議會決議案七日內公告，
 * 未公告亦未移請覆議者，由學生議會祕書處公告，公告後決議案即生效。
 * 本欄位是該項公告作業的內容來源；系統只保存與呈現文字，不代為認定決議效力。
 */
export async function updateProposalResolution(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return;
  await prisma.proposal.update({
    where: { id },
    data: { resolution: optStr(fd, "resolution") },
  });
  revalidateMeetingRoutes();
}

const REVIEW_STATUSES = ["pending", "passed", "rejected"] as const;

/**
 * 程序委員會審核結果與議程順序。
 * 法源：2.3《國立臺東大學學生議會暨常會職權行使法》§9②
 *「行政中心或學生議員提出之議案，應先送程序委員會，提報常會朗讀標題後，即應交付有關委員會審查。」
 * 註：該條只規定「應先送程序委員會」，未明文授權程委得決定是否列入議程；
 * 本欄位僅記錄承辦與程委的實際處理結果，系統不代為認定其效力。
 */
export async function setProposalReview(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return;
  const raw = str(fd, "reviewStatus");
  const reviewStatus = (REVIEW_STATUSES as readonly string[]).includes(raw) ? raw : "pending";
  const orderRaw = str(fd, "order");
  await prisma.proposal.update({
    where: { id },
    data: { reviewStatus, ...(orderRaw ? { order: int(fd, "order", 0) } : {}) },
  });
  revalidateMeetingRoutes();
}

export async function deleteProposal(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.proposal.delete({ where: { id } });
    revalidateMeetingRoutes();
  }
}

// —— 通知生成（只生內容，不寄送）——
export async function generateNoticeAction(fd: FormData) {
  const user = await requireUser();
  const meetingId = str(fd, "meetingId");
  const kindRaw = str(fd, "kind");
  const kind: NoticeKind = kindRaw === "agenda" ? "agenda" : "notice";
  if (!meetingId) return;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { _count: { select: { proposals: true } } },
  });
  if (!meeting) return;

  let recipientIds = fd.getAll("recipientIds").filter((v): v is string => typeof v === "string");
  // 未帶收件人（例如從時間軸觸發）→ 預設全體啟用中收件人。
  if (recipientIds.length === 0) {
    const active = await prisma.recipient.findMany({ where: { active: true }, select: { id: true } });
    recipientIds = active.map((r) => r.id);
  }
  const audience = str(fd, "audience") || undefined;
  const signer = str(fd, "signer") || undefined;
  const contactPhone = str(fd, "contactPhone") || undefined;
  const contactEmail = str(fd, "contactEmail") || undefined;
  const subjectPrefix = str(fd, "subjectPrefix") || undefined;
  const forNotice: MeetingForNotice = {
    session: meeting.session,
    academicYear: meeting.academicYear,
    name: meeting.name,
    meetingAt: meeting.meetingAt,
    location: meeting.location,
    meetingUrl: meeting.meetingUrl,
    docNumber: meeting.docNumber,
    proposalDeadline: meeting.proposalDeadline,
    notes: meeting.notes,
  };
  const { subject, body, html } = generateNotice(forNotice, kind, {
    proposalCount: meeting._count.proposals,
    audience,
    signer,
    contactPhone,
    contactEmail,
    subjectPrefix,
  });

  await prisma.meetingNotice.create({
    data: {
      meetingId,
      kind,
      subject,
      bodyText: body,
      bodyHtml: html,
      recipientIds,
      createdById: user.sub,
    },
  });
  revalidateMeetingRoutes();
}

export async function deleteNotice(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingNotice.delete({ where: { id } });
    revalidateMeetingRoutes();
  }
}

// —— 提醒 ——
export async function addReminder(fd: FormData) {
  await requireUser();
  const meetingId = str(fd, "meetingId");
  const offsetDays = int(fd, "offsetDays", 0);
  if (!meetingId) return;
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return;
  await prisma.meetingReminder.create({
    data: {
      meetingId,
      offsetDays,
      fireAt: computeFireAt(meeting.meetingAt, offsetDays),
      channel: "inapp",
    },
  });
  revalidateMeetingRoutes();
}

export async function markReminderDone(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingReminder.update({ where: { id }, data: { sentAt: new Date() } });
    revalidateMeetingRoutes();
  }
}

export async function unmarkReminderDone(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingReminder.update({ where: { id }, data: { sentAt: null } });
    revalidateMeetingRoutes();
  }
}

export async function deleteReminder(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingReminder.delete({ where: { id } });
    revalidateMeetingRoutes();
  }
}

// —— 自訂里程碑（各委員會時間等）——
export async function addMilestone(fd: FormData) {
  await requireUser();
  const meetingId = str(fd, "meetingId");
  const title = str(fd, "title");
  const at = parseTaipeiLocal(str(fd, "at"));
  if (!meetingId || !title || !at) return;
  await prisma.meetingMilestone.create({
    data: { meetingId, title, at, note: optStr(fd, "note") },
  });
  revalidateMeetingRoutes();
}

export async function deleteMilestone(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingMilestone.delete({ where: { id } });
    revalidateMeetingRoutes();
  }
}

// —— 收件人 ——
export async function addRecipient(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  const email = str(fd, "email");
  if (!name || !email) return;
  await prisma.recipient.create({
    data: {
      name,
      email: email.toLowerCase(),
      roleTag: str(fd, "roleTag") || "議員",
      session: int(fd, "session", 0),
    },
  });
  revalidatePath("/console/meetings/recipients");
}

export async function toggleRecipient(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (!id) return;
  const r = await prisma.recipient.findUnique({ where: { id } });
  if (r) {
    await prisma.recipient.update({ where: { id }, data: { active: !r.active } });
    revalidatePath("/console/meetings/recipients");
  }
}

export async function updateRecipient(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email");
  if (!id || !name || !email) return;
  await prisma.recipient.update({
    where: { id },
    data: {
      name,
      email: email.toLowerCase(),
      roleTag: str(fd, "roleTag") || "議員",
      session: int(fd, "session", 0),
    },
  });
  revalidatePath("/console/meetings/recipients");
}

export async function deleteRecipient(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  if (id) {
    await prisma.recipient.delete({ where: { id } });
    revalidatePath("/console/meetings/recipients");
  }
}
