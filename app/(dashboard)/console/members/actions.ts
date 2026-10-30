"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";

const BASE = "/console/members";
const ROLES = ["admin", "officer", "viewer"] as const;

function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function normRole(r: string): string {
  return (ROLES as readonly string[]).includes(r) ? r : "officer";
}

export async function createMember(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name") || null;
  const role = normRole(str(fd, "role"));
  const password = str(fd, "password");

  if (!email || !email.includes("@") || password.length < 8) {
    redirect(`${BASE}?err=input`);
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) redirect(`${BASE}?err=dup`);

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({ data: { email, name, role, passwordHash } });
  } catch (e) {
    // 兩位管理員同時新增同一個 email：上面的查詢都說沒有，後到的 create 撞唯一鍵，照重複處理而不是 500。
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") redirect(`${BASE}?err=dup`);
    throw e;
  }
  redirect(`${BASE}?ok=${encodeURIComponent(email)}`);
}

export async function resetMemberPassword(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const password = str(fd, "password");
  if (!id) return;
  if (password.length < 8) redirect(`${BASE}?err=input`);
  // updateMany：名單頁開著的時候另一位管理員可能已經刪掉這個人，update 找不到會丟 P2025 變 500；
  // 找不到就什麼都不做，重新整理後名單上也不會再有他。
  await prisma.user.updateMany({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath(BASE);
}

export async function setMemberRole(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const role = normRole(str(fd, "role"));
  if (id) {
    await prisma.user.updateMany({ where: { id }, data: { role } }); // 同 resetMemberPassword：已刪除的人不 500
    revalidatePath(BASE);
  }
}

export async function deleteMember(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  // 不能刪自己（避免鎖死管理權）。
  if (id && id !== me.sub) {
    await prisma.user.deleteMany({ where: { id } }); // 兩人同時刪同一個人，後到的不 500
    revalidatePath(BASE);
  }
}
