/**
 * Session cookie 讀寫 — server（node runtime：route handler / server component）專用。
 * 用 next/headers 的 cookies()；純 token 簽/驗在 ./token（edge-safe，proxy.ts 也用那支）。
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { withCurrentUser } from "./current-user";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  sessionCookieOptions,
  type SessionPayload,
} from "./token";

export type { SessionPayload };

export async function createSession(user: {
  id: string;
  email: string;
  role: string;
  name: string | null;
}): Promise<void> {
  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? undefined,
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

// 同一次請求裡 layout、頁面、action 會各叫一次 readSession，用 React cache 合成一次查詢。
const findUser = cache((id: string) =>
  prisma.user.findUnique({ where: { id }, select: { email: true, role: true, name: true } })
);

/** 簽章有效、而且資料庫裡還有這個人才算登入；角色以資料庫為準（見 ./current-user）。 */
export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return withCurrentUser(payload, findUser);
}

export async function clearSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
