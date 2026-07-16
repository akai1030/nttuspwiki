"use server";

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

  await prisma.user.create({
    data: { email, name, role, passwordHash: await hashPassword(password) },
  });
  redirect(`${BASE}?ok=${encodeURIComponent(email)}`);
}

export async function resetMemberPassword(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const password = str(fd, "password");
  if (!id) return;
  if (password.length < 8) redirect(`${BASE}?err=input`);
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath(BASE);
}

export async function setMemberRole(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const role = normRole(str(fd, "role"));
  if (id) {
    await prisma.user.update({ where: { id }, data: { role } });
    revalidatePath(BASE);
  }
}

export async function deleteMember(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  // 不能刪自己（避免鎖死管理權）。
  if (id && id !== me.sub) {
    await prisma.user.delete({ where: { id } });
    revalidatePath(BASE);
  }
}
