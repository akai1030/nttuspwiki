/**
 * Session 簽章驗過之後，再對一次資料庫的 User。
 *
 * JWT 裡的角色是登入當下寫進去的，有效 7 天。只看簽章的話，管理員在「成員」頁刪掉某人或把他降級，
 * 對方已登入的瀏覽器在 7 天內照樣進得了後台、看得到名冊（2026-11-28 本機實測：刪除後 /console/meetings/recipients 仍 200）。
 * 所以：資料庫查不到這個人 → 當作未登入；角色、姓名、email 一律以資料庫為準，改角色立即生效。
 *
 * 跟 next/headers、Prisma 分開放，測試可以傳假的查詢函式（scripts/test-session.ts）。
 */
import type { SessionPayload } from "./token";

export type UserRow = { email: string; role: string; name: string | null };

export async function withCurrentUser(
  payload: SessionPayload,
  findUser: (id: string) => Promise<UserRow | null>
): Promise<SessionPayload | null> {
  const u = await findUser(payload.sub);
  if (!u) return null;
  return { sub: payload.sub, email: u.email, role: u.role, name: u.name ?? undefined };
}
