"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { copy } from "@/lib/copy";
import { lineConfig } from "@/lib/line/config";
import { groupSummary, pushText } from "@/lib/line/client";
import { chooseGroup, clearGroupSelection, saveGroupName, selectedGroup } from "@/lib/line/groups";
import { dispatchDueReminders } from "@/lib/line/dispatch";
import { MAX_ATTEMPTS } from "@/lib/line/plan";

// LINE 提醒的後台操作。改的是「提醒發到哪個群組」與實際發訊息，viewer 不能動，只給 admin/officer。

function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateLine() {
  revalidatePath("/console/line");
  revalidatePath("/console/meetings/[slug]", "page");
}

export async function selectLineGroup(fd: FormData) {
  const user = await requireRole(["admin", "officer"]);
  const ok = await chooseGroup(str(fd, "groupId"), user.email);
  revalidateLine();
  redirect(ok ? "/console/line?ok=select" : "/console/line?err=select");
}

export async function unselectLineGroup(fd: FormData) {
  await requireRole(["admin", "officer"]);
  await clearGroupSelection(str(fd, "groupId"));
  revalidateLine();
  redirect("/console/line?ok=unselect");
}

export async function refreshLineGroupName(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const cfg = lineConfig();
  const groupId = str(fd, "groupId");
  if (cfg && groupId) await saveGroupName(groupId, await groupSummary(cfg.token, groupId));
  revalidateLine();
}

/** 測試訊息：推一則到選定的群組（依群組人數計則數，畫面上有寫）。 */
export async function sendLineTest() {
  await requireRole(["admin", "officer"]);
  const cfg = lineConfig();
  if (!cfg) redirect("/console/line?err=off");
  const group = await selectedGroup();
  if (!group) redirect("/console/line?err=nogroup");
  const res = await pushText(cfg.token, group.id, copy.line.message.test);
  if (!res.ok) console.error("[line test] push failed", res.status, res.error);
  redirect(res.ok ? "/console/line?ok=test" : `/console/line?err=send&status=${res.status}`);
}

/** 不等排程，馬上跑一次發送（跟排程同一支，已發過的不會重發）。 */
export async function dispatchLineNow() {
  await requireRole(["admin", "officer"]);
  const r = await dispatchDueReminders();
  revalidateLine();
  if (r.status === "disabled") redirect("/console/line?err=off");
  if (r.status === "no-group") redirect("/console/line?err=nogroup");
  redirect(`/console/line?ok=dispatch&sent=${r.sent}&skipped=${r.skipped}&failed=${r.failed}`);
}

/** 達重試上限的提醒，歸零重來（下次排程或「立即發送」時再試）。 */
export async function retryLineReminder(fd: FormData) {
  await requireRole(["admin", "officer"]);
  const id = str(fd, "id");
  if (!id) return;
  await prisma.meetingReminder.updateMany({
    where: { id, sentAt: null, attempts: { gte: MAX_ATTEMPTS } },
    data: { attempts: 0, lastError: null, claimedAt: null },
  });
  revalidateLine();
}
