/**
 * 幹部路由守衛 — server component 用。未登入 → 導去 /login（帶 next 回跳）；權限不足 → 導回中控台。
 * middleware.ts 已在邊界擋一層，這裡是「取得使用者身分 + 縱深防禦」：直接開頁網址也擋得住。
 */
import { redirect } from "next/navigation";
import { readSession } from "./session";
import type { SessionPayload } from "./token";

export async function requireUser(next?: string): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return session; // redirect() 回傳 never，此處 session 已收斂為非 null
}

export async function requireRole(
  roles: readonly string[],
  next?: string
): Promise<SessionPayload> {
  const session = await requireUser(next);
  if (!roles.includes(session.role)) {
    redirect("/console?denied=1");
  }
  return session;
}

export async function requireAdmin(next?: string): Promise<SessionPayload> {
  return requireRole(["admin"], next);
}
