/**
 * LINE Messaging API 的最小呼叫集（不裝 SDK）。全部只在伺服器端跑，token 不出這個檔。
 *
 * 計費（2026-11-15 查官方說明）：push 到群組依群組人數計則數；reply（用 replyToken 回覆）不計。
 * 所以機器人被加進群組時的招呼用 reply，提醒與測試訊息才用 push。
 */
import { isLineGroupId } from "./plan";

// LINE_API_BASE 只在非正式環境生效：本機測試時指到模擬伺服器，看得到送出的內容與 retry key。
// 正式環境（NODE_ENV=production）一律打 api.line.me，設了也不理。
const API =
  process.env.NODE_ENV !== "production" && process.env.LINE_API_BASE
    ? process.env.LINE_API_BASE.replace(/\/+$/, "")
    : "https://api.line.me";
const TIMEOUT_MS = 10_000;
/** 單則文字訊息上限 5,000 字，留一點餘裕。 */
export const MAX_TEXT_LENGTH = 4_900;

export type LineOk<T> = { ok: true; status: number; requestId: string | null; data: T };
export type LineErr = {
  ok: false;
  status: number; // 0＝沒拿到回應（逾時、網路斷）
  requestId: string | null;
  acceptedRequestId: string | null; // 409（同一個 retry key 已被接受）時，原本那次的請求編號
  error: string;
};
export type LineResult<T> = LineOk<T> | LineErr;

async function call<T>(
  token: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<LineResult<T>> {
  try {
    const res = await fetch(API + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const requestId = res.headers.get("x-line-request-id");
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (res.ok) return { ok: true, status: res.status, requestId, data: json as T };
    const message =
      json && typeof json === "object" && typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : text.slice(0, 200);
    return {
      ok: false,
      status: res.status,
      requestId,
      acceptedRequestId: res.headers.get("x-line-accepted-request-id"),
      error: message || `HTTP ${res.status}`,
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    return {
      ok: false,
      status: 0,
      requestId: null,
      acceptedRequestId: null,
      error: name === "TimeoutError" || name === "AbortError" ? "timeout" : e instanceof Error ? e.message : String(e),
    };
  }
}

function clip(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
}

/**
 * 推一則文字到群組。retryKey 固定由提醒算出（lib/line/plan.ts retryKeyFor）：
 * 上一次其實送達、只是沒收到回應時，重送會得到 409，不會在群組裡出現第二則。
 */
export function pushText(token: string, to: string, text: string, retryKey?: string) {
  return call<{ sentMessages?: { id: string }[] }>(
    token,
    "POST",
    "/v2/bot/message/push",
    { to, messages: [{ type: "text", text: clip(text) }] },
    retryKey ? { "X-Line-Retry-Key": retryKey } : undefined
  );
}

/** 用 replyToken 回覆（不計入每月則數；replyToken 只能用一次、要在收到事件後短時間內用）。 */
export function replyText(token: string, replyToken: string, text: string) {
  return call<unknown>(token, "POST", "/v2/bot/message/reply", {
    replyToken,
    messages: [{ type: "text", text: clip(text) }],
  });
}

function groupPath(groupId: string, tail: string): string | null {
  return isLineGroupId(groupId) ? `/v2/bot/group/${groupId}/${tail}` : null;
}

export async function groupSummary(token: string, groupId: string) {
  const p = groupPath(groupId, "summary");
  if (!p) return null;
  const r = await call<{ groupName?: string }>(token, "GET", p);
  return r.ok && typeof r.data?.groupName === "string" ? r.data.groupName : null;
}

export async function groupMemberCount(token: string, groupId: string) {
  const p = groupPath(groupId, "members/count");
  if (!p) return null;
  const r = await call<{ count?: number }>(token, "GET", p);
  return r.ok && typeof r.data?.count === "number" ? r.data.count : null;
}

/** 本月上限：type＝none 表示沒有上限，limited 時 value 是上限則數。 */
export async function messageQuota(token: string) {
  const r = await call<{ type?: string; value?: number }>(token, "GET", "/v2/bot/message/quota");
  if (!r.ok) return null;
  return { limited: r.data?.type === "limited", value: typeof r.data?.value === "number" ? r.data.value : null };
}

/** 本月已用則數（push、multicast、broadcast、narrowcast 合計）。 */
export async function messageConsumption(token: string) {
  const r = await call<{ totalUsage?: number }>(token, "GET", "/v2/bot/message/quota/consumption");
  return r.ok && typeof r.data?.totalUsage === "number" ? r.data.totalUsage : null;
}
