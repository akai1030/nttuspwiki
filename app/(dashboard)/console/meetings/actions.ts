"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guard";
import { parseTaipeiLocal } from "@/lib/meetings/roc";
import { generateNotice, type NoticeKind, type MeetingForNotice } from "@/lib/meetings/notice";
import { computeFireAt } from "@/lib/meetings/reminders";

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

  const m = await prisma.meeting.create({
    data: {
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
  redirect(`/console/meetings/${m.id}`);
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
  await prisma.meeting.update({
    where: { id },
    data: {
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
  redirect(`/console/meetings/${id}`);
}

export async function setMeetingStatus(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const statusRaw = str(fd, "status");
  const ok = (["DRAFT", "NOTICED", "HELD", "CLOSED"] as const).includes(statusRaw as never);
  if (id && ok) {
    await prisma.meeting.update({ where: { id }, data: { status: statusRaw as never } });
    revalidatePath(`/console/meetings/${id}`);
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
  revalidatePath(`/console/meetings/${meetingId}`);
}

export async function deleteProposal(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.proposal.delete({ where: { id } });
    revalidatePath(`/console/meetings/${meetingId}`);
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
  const { subject, body } = generateNotice(forNotice, kind, {
    proposalCount: meeting._count.proposals,
    audience,
  });

  await prisma.meetingNotice.create({
    data: {
      meetingId,
      kind,
      subject,
      bodyText: body,
      recipientIds,
      createdById: user.sub,
    },
  });
  revalidatePath(`/console/meetings/${meetingId}`);
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
  revalidatePath(`/console/meetings/${meetingId}`);
}

export async function markReminderDone(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingReminder.update({ where: { id }, data: { sentAt: new Date() } });
    revalidatePath(`/console/meetings/${meetingId}`);
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
  revalidatePath(`/console/meetings/${meetingId}`);
}

export async function deleteMilestone(fd: FormData) {
  await requireUser();
  const id = str(fd, "id");
  const meetingId = str(fd, "meetingId");
  if (id) {
    await prisma.meetingMilestone.delete({ where: { id } });
    revalidatePath(`/console/meetings/${meetingId}`);
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
