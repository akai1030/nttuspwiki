"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { meetingKey } from "@/lib/meetings/slug";
import { ruleById } from "@/lib/meetings/vote-rules";
import {
  MOTION_OPTIONS,
  idList,
  parseCandidates,
  resolutionLine,
  secretFromLawMethod,
  summarize,
  type VoteKind,
} from "@/lib/meetings/voting";

/**
 * 線上表決 — 祕書處／主席在現場議事控制台操作。
 * 跟現場議事其他按鈕同一個紀律：開票、截止、作廢都是人按下去才發生，沒有倒數自動截止。
 */

function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateLive() {
  revalidatePath("/console/meetings/[slug]/live", "page");
  revalidatePath("/meetings/[slug]/live", "page");
  revalidatePath("/meetings/[slug]", "page");
}

/** 錯誤帶回控制台顯示（表單送出後頁面會重整，需要一個看得到的原因）。 */
function back(m: { slug: string | null; id: string }, error?: string): never {
  const q = error ? `?voteError=${error}` : "";
  redirect(`/console/meetings/${meetingKey(m)}/live${q}#vote`);
}

export async function openVote(fd: FormData) {
  const user = await requireRole(["admin", "officer"]);
  const meetingId = str(fd, "meetingId");
  const m = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, slug: true, liveOpen: true, liveAttendeeIds: true },
  });
  if (!m) return;
  if (!m.liveOpen) back(m, "notLive");

  const eligible = idList(m.liveAttendeeIds);
  if (eligible.length === 0) back(m, "noRollCall");

  const already = await prisma.vote.count({ where: { meetingId: m.id, status: "open" } });
  if (already > 0) back(m, "alreadyOpen");

  const kind: VoteKind = str(fd, "kind") === "election" ? "election" : "motion";
  const title = str(fd, "title").slice(0, 200);
  if (!title) back(m, "noTitle");

  // 議案只接受本場的；議案類型有法定表決方式時，以法定為準（不看表單送來的值）。
  const proposalId = str(fd, "proposalId") || null;
  let matterType: string | null = null;
  if (proposalId) {
    const p = await prisma.proposal.findFirst({
      where: { id: proposalId, meetingId: m.id },
      select: { matterType: true },
    });
    if (!p) back(m, "badProposal");
    matterType = p.matterType;
  }
  const lawSecret = secretFromLawMethod(ruleById(matterType)?.method);
  const picked = str(fd, "secret");
  const secret = lawSecret ?? (picked === "1" ? true : picked === "0" ? false : null);
  if (secret === null) back(m, "noMethod");

  let labels: string[];
  let seats: number | null = null;
  if (kind === "election") {
    const c = parseCandidates(str(fd, "candidates"));
    if (!c.ok) back(m, "badCandidates");
    labels = c.names;
    const s = Number.parseInt(str(fd, "seats"), 10);
    seats = Number.isFinite(s) && s > 0 ? Math.min(s, labels.length) : 1;
  } else {
    labels = [...MOTION_OPTIONS];
  }

  await prisma.vote.create({
    data: {
      meetingId: m.id,
      proposalId,
      kind,
      secret,
      title,
      seats,
      matterType,
      eligibleIds: eligible,
      openedById: user.sub,
      options: { create: labels.map((label, order) => ({ label, order })) },
    },
  });
  await prisma.meeting.update({ where: { id: m.id }, data: { liveUpdatedAt: new Date() } });
  revalidateLive();
  back(m);
}

async function voteMeeting(voteId: string) {
  return prisma.vote.findUnique({
    where: { id: voteId },
    select: { id: true, status: true, meeting: { select: { id: true, slug: true } } },
  });
}

/**
 * 截止。UPDATE 會等正在寫入的投票交易（它們對這一列持 FOR SHARE 鎖）結束才生效，
 * 所以截止之後不會再有票進來。
 */
export async function closeVote(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const v = await voteMeeting(str(fd, "voteId"));
  if (!v) return;
  await prisma.vote.updateMany({
    where: { id: v.id, status: "open" },
    data: { status: "closed", closedAt: new Date() },
  });
  await prisma.meeting.update({ where: { id: v.meeting.id }, data: { liveUpdatedAt: new Date() } });
  revalidateLive();
  back(v.meeting);
}

/** 作廢（例如開錯方式、名單點錯）。票數保留在後台備查，看板與公開頁不再顯示。 */
export async function voidVote(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const v = await voteMeeting(str(fd, "voteId"));
  if (!v) return;
  await prisma.vote.updateMany({
    where: { id: v.id, status: { in: ["open", "closed"] } },
    data: { status: "voided", closedAt: new Date() },
  });
  await prisma.meeting.update({ where: { id: v.meeting.id }, data: { liveUpdatedAt: new Date() } });
  revalidateLive();
  back(v.meeting);
}

/** 把票數寫成一句話接在該案決議欄後面；通過與否由主席在決議欄補上。 */
export async function applyVoteToResolution(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const vote = await prisma.vote.findUnique({
    where: { id: str(fd, "voteId") },
    include: {
      options: { select: { id: true, label: true, order: true, count: true } },
      _count: { select: { voters: true } },
      meeting: { select: { id: true, slug: true } },
    },
  });
  if (!vote || vote.status !== "closed" || !vote.proposalId) return;
  const s = summarize(vote.options, idList(vote.eligibleIds).length, vote._count.voters);
  const line = resolutionLine(vote.kind as VoteKind, vote.secret, s);
  const p = await prisma.proposal.findFirst({
    where: { id: vote.proposalId, meetingId: vote.meetingId },
    select: { id: true, resolution: true },
  });
  if (!p) return;
  const prev = p.resolution?.trim() ?? "";
  if (prev.includes(line)) back(vote.meeting); // 重複按不重複寫
  await prisma.proposal.update({
    where: { id: p.id },
    data: { resolution: prev ? `${prev}\n${line}` : line },
  });
  revalidateLive();
  back(vote.meeting);
}

/** 作廢某位議員的舊連結並產生新連結（連結外流時用）。 */
export async function reissueVoteLink(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const id = str(fd, "id");
  if (!id) return;
  await prisma.recipient.update({ where: { id }, data: { voteLinkVersion: { increment: 1 } } });
  revalidatePath("/console/meetings/recipients");
}
