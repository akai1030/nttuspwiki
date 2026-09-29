/**
 * 議員投票登入（共用網址 /vote）：學號＋手機末四碼。
 *
 * 2026-09-29 議會決定：開會通知一封信寄全部人，放同一條投票網址，議員自己登入；
 * 專屬連結（/v/…）保留當備用（名冊沒有手機的人、登入有困難的人）。
 * 已知取捨：知道某人學號與手機的人能冒名。防線是錯誤次數限制（lib/auth/rate-limit.ts）、
 * 只有點名出席者能投、一人一票（本人投時會看到「已投過」而發現），以及記名投票公開列名。
 *
 * 登入後的 cookie 內容就是該議員的專屬連結簽章（vote-link.ts），
 * 所以「作廢重發」會一併讓已登入的裝置失效。
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const VOTER_COOKIE = "nttusp_voter";
/** 一天：開會當天有效；隔天再開會重新登入即可，公用電腦忘了登出的風險也有上限。 */
const MAX_AGE_SECONDS = 24 * 60 * 60;

export function normStudentId(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

/** 名冊手機可能寫成 0912-345-678、0912 345 678 或 +886…，只取數字的最後四碼。 */
export function phoneLast4(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
}

export type VoterLookup = { id: string; voteLinkVersion: number } | "noPhone" | null;

/** 以學號找啟用中的議員（同學號跨屆連任取最新一屆），再比對手機末四碼。 */
export async function findVoter(studentId: string, last4: string): Promise<VoterLookup> {
  const r = await prisma.recipient.findFirst({
    where: { active: true, roleTag: "議員", studentId: { equals: normStudentId(studentId), mode: "insensitive" } },
    orderBy: { session: "desc" },
    select: { id: true, phone: true, voteLinkVersion: true },
  });
  if (!r) return null;
  const want = phoneLast4(r.phone);
  if (!want) return "noPhone";
  return want === last4 ? { id: r.id, voteLinkVersion: r.voteLinkVersion } : null;
}

export async function setVoterCookie(token: string): Promise<void> {
  (await cookies()).set(VOTER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readVoterToken(): Promise<string | null> {
  return (await cookies()).get(VOTER_COOKIE)?.value ?? null;
}

export async function clearVoterCookie(): Promise<void> {
  (await cookies()).set(VOTER_COOKIE, "", { path: "/", maxAge: 0 });
}
