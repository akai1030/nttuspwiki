/**
 * 登入失敗次數限制 — 擋線上猜密碼（幹部登入）與猜手機末四碼（議員投票登入）。
 *
 * 存在行程記憶體裡：本站只跑一個容器，重新部署後歸零也無妨（最多多給攻擊者一輪額度）。
 * 以「信箱」與「來源 IP」兩把鑰匙各自計數，任一把超過就擋：
 *   - 信箱：擋針對某位幹部的猜測（換 IP 也沒用）
 *   - IP：擋同一來源輪流猜不同信箱
 * 代價是有人可以故意打錯某位幹部的密碼讓他暫時登不進來；以本站規模可接受，且 15 分鐘自動解除。
 */

const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES = 8;
const MAX_KEYS = 5000;

type Entry = { count: number; resetAt: number };
const failures = new Map<string, Entry>();

function prune(now: number) {
  if (failures.size < MAX_KEYS) return;
  for (const [k, e] of failures) if (e.resetAt <= now) failures.delete(k);
  // 全部都還沒過期（大量攻擊）時清掉最舊的一半，避免 Map 無限長大。
  if (failures.size >= MAX_KEYS) {
    let drop = Math.floor(failures.size / 2);
    for (const k of failures.keys()) {
      if (drop-- <= 0) break;
      failures.delete(k);
    }
  }
}

/** 任一把鑰匙已達上限就回 true（這次請求不必再驗密碼）。max 預設 8，各用途可自訂。 */
export function isLimited(keys: string[], max = MAX_FAILURES, now = Date.now()): boolean {
  return keys.some((k) => {
    const e = failures.get(k);
    return !!e && e.resetAt > now && e.count >= max;
  });
}

export function recordFailure(keys: string[], now = Date.now()): void {
  prune(now);
  for (const k of keys) {
    const e = failures.get(k);
    if (!e || e.resetAt <= now) failures.set(k, { count: 1, resetAt: now + WINDOW_MS });
    else e.count += 1;
  }
}

/**
 * 檢查上限並先記一次失敗，給「接著要 await 驗證」的登入流程用。
 *
 * 不能拆成 isLimited → await 驗密碼 → recordFailure：同一瞬間送來的請求都會在任何一筆失敗被記下之前
 * 通過檢查，30 個並發請求就有 30 次機會（2026-10-17 本機實測），8 次上限形同虛設。
 * 這裡檢查與記數之間沒有 await，Node 單執行緒下同時進來的請求會一個一個輪到。
 *
 * 回傳 false＝已達上限，這次不要驗。true 之後驗證成功、或這次不該算失敗時，呼叫 releaseAttempt 退回。
 */
export function tryAttempt(limits: Array<[key: string, max: number]>, now = Date.now()): boolean {
  if (limits.some(([k, max]) => isLimited([k], max, now))) return false;
  recordFailure(limits.map(([k]) => k), now);
  return true;
}

/** 退回 tryAttempt 先記的那一次（計數歸零就刪掉）。 */
export function releaseAttempt(keys: string[], now = Date.now()): void {
  for (const k of keys) {
    const e = failures.get(k);
    if (!e || e.resetAt <= now) continue;
    if (--e.count <= 0) failures.delete(k);
  }
}

/** 登入成功只清信箱那把；IP 那把留著，免得攻擊者用自己的帳號洗掉同 IP 的失敗紀錄。 */
export function clearKey(key: string): void {
  failures.delete(key);
}

/**
 * 取來源 IP。反向代理會把實際連線位址附加在 X-Forwarded-For 最後，
 * 最前面那段可由用戶端自己填（可偽造），所以取最後一段。
 * 取不到就回 null、只用信箱計數——若硬給「unknown」，所有人會共用同一把鑰匙，
 * 一個人打錯 8 次就讓全站登不進來。
 */
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip")?.trim() || null;
}

export const RATE_LIMIT_WINDOW_MINUTES = WINDOW_MS / 60000;
