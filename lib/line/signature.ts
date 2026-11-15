import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LINE webhook 簽章：x-line-signature ＝ base64(HMAC-SHA256(channel secret, 原始請求內容))。
 * 要拿「收到的原始位元組」算，不能先 JSON.parse 再轉回字串（空白、跳脫會不一樣）。
 * 比對用常數時間，避免以回應時間猜簽章。
 */
export function verifyLineSignature(rawBody: Buffer | string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  return safeEqual(signature.trim(), expected);
}

/** 常數時間字串比對（長度不同直接 false）。 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 從 Authorization: Bearer <密鑰> 取出密鑰；格式不對回空字串。 */
export function bearerToken(header: string | null): string {
  if (!header) return "";
  const m = header.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : "";
}
