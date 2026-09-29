/**
 * Session cookie 讀寫 — server（node runtime：route handler / server component）專用。
 * 用 next/headers 的 cookies()；純 token 簽/驗在 ./token（edge-safe，proxy.ts 也用那支）。
 */
import { cookies } from "next/headers";
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

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function clearSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
}
