/**
 * LINE 群組紀錄。webhook 收到群組事件時寫入，後台 /console/line 選定發送對象。
 * 只存 groupId、群組名稱與時間；群組裡的對話內容、成員的 userId 一律不存。
 */
import { prisma } from "@/lib/db";
import { isLineGroupId } from "./plan";

/** 目前選定的發送群組：selectedAt 最新、且機器人還在群組裡的那個。 */
export function selectedGroup() {
  return prisma.lineGroup.findFirst({
    where: { selectedAt: { not: null }, leftAt: null },
    orderBy: { selectedAt: "desc" },
  });
}

export function listGroups() {
  return prisma.lineGroup.findMany({ orderBy: [{ leftAt: "asc" }, { lastEventAt: "desc" }] });
}

/** 機器人被加進群組（join）。重新加入時清掉 leftAt。 */
export async function recordJoin(groupId: string, now: Date): Promise<void> {
  if (!isLineGroupId(groupId)) return;
  await prisma.lineGroup.upsert({
    where: { id: groupId },
    create: { id: groupId, joinedAt: now, lastEventAt: now },
    update: { joinedAt: now, leftAt: null, lastEventAt: now },
  });
}

/**
 * 群組裡的其他事件（有人發言、有人加入…）。機器人在 webhook 設定好之前就已經在群組裡的話，
 * 收不到 join，靠這個補記。已經記過的群組不再寫（群組聊天很頻繁，不必每則都更新）。
 * 回傳 true 表示這次是新記下的。
 */
export async function recordSeen(groupId: string, now: Date): Promise<boolean> {
  if (!isLineGroupId(groupId)) return false;
  const existing = await prisma.lineGroup.findUnique({ where: { id: groupId }, select: { leftAt: true } });
  if (existing && !existing.leftAt) return false;
  await prisma.lineGroup.upsert({
    where: { id: groupId },
    create: { id: groupId, joinedAt: now, lastEventAt: now },
    update: { leftAt: null, lastEventAt: now },
  });
  return true;
}

/** 機器人被移出群組（leave）。選定狀態一併取消，之後不會再往這裡發。 */
export async function recordLeave(groupId: string, now: Date): Promise<void> {
  if (!isLineGroupId(groupId)) return;
  await prisma.lineGroup.updateMany({
    where: { id: groupId },
    data: { leftAt: now, lastEventAt: now, selectedAt: null, selectedBy: null },
  });
}

export async function saveGroupName(groupId: string, name: string | null): Promise<void> {
  if (!isLineGroupId(groupId) || !name) return;
  await prisma.lineGroup.updateMany({ where: { id: groupId }, data: { name: name.slice(0, 200) } });
}

/** 選定一個群組，其他的取消（同一筆交易）。被移出的群組不能選。 */
export async function chooseGroup(groupId: string, by: string): Promise<boolean> {
  if (!isLineGroupId(groupId)) return false;
  return prisma.$transaction(async (tx) => {
    const g = await tx.lineGroup.findUnique({ where: { id: groupId }, select: { leftAt: true } });
    if (!g || g.leftAt) return false;
    await tx.lineGroup.updateMany({
      where: { NOT: { id: groupId }, selectedAt: { not: null } },
      data: { selectedAt: null, selectedBy: null },
    });
    await tx.lineGroup.update({ where: { id: groupId }, data: { selectedAt: new Date(), selectedBy: by } });
    return true;
  });
}

export async function clearGroupSelection(groupId: string): Promise<void> {
  if (!isLineGroupId(groupId)) return;
  await prisma.lineGroup.updateMany({ where: { id: groupId }, data: { selectedAt: null, selectedBy: null } });
}
