"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { copy } from "@/lib/copy";
import { clearKey, clientIp, isLimited, recordFailure } from "@/lib/auth/rate-limit";
import { clearVoterCookie, findVoter, normStudentId, setVoterCookie } from "@/lib/meetings/voter-login";
import { voteToken } from "@/lib/meetings/vote-link";

const c = copy.meetings.vote.lobby;

/** studentId 帶回表單：React 19 送出後會重設表單，不帶回來議員得重打學號。 */
export type VoterLoginState = { error: string; studentId: string } | null;

/**
 * 同一個 IP 的上限放寬到 40：開會時議員多半連同一個校園 Wi-Fi（共用對外 IP），
 * 若照幹部登入的 8 次，幾個人打錯就會讓整間會議室都登不進來。
 * 學號那把維持 8 次，這才是擋「猜某人手機末四碼」的主要防線。
 */
const IP_MAX = 40;

export async function voterLogin(_prev: VoterLoginState, fd: FormData): Promise<VoterLoginState> {
  const rawSid = fd.get("studentId");
  const rawPhone = fd.get("phone4");
  const sid = normStudentId(typeof rawSid === "string" ? rawSid : "");
  const last4 = (typeof rawPhone === "string" ? rawPhone : "").replace(/\D/g, "");
  const fail = (error: string): VoterLoginState => ({ error, studentId: sid });
  if (!sid || last4.length !== 4) return fail(c.errors.missing);

  const ip = clientIp(await headers());
  const sidKey = `voter-sid:${sid}`;
  const ipKey = ip ? `voter-ip:${ip}` : null;
  if (isLimited([sidKey]) || (ipKey && isLimited([ipKey], IP_MAX))) return fail(c.errors.tooMany);

  const found = await findVoter(sid, last4);
  if (found === "noPhone") return fail(c.errors.noPhone);
  if (!found) {
    recordFailure(ipKey ? [sidKey, ipKey] : [sidKey]);
    return fail(c.errors.invalid);
  }
  clearKey(sidKey);
  await setVoterCookie(voteToken(found.id, found.voteLinkVersion));
  redirect("/vote");
}

export async function voterLogout(): Promise<void> {
  await clearVoterCookie();
  redirect("/vote");
}
