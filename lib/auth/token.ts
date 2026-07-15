/**
 * Session token — 用 jose 簽 HS256 JWT（小型 crypto 函式庫，非 auth 框架）。
 * 這支刻意「edge-safe」：只用 jose + Web Crypto + process.env，不碰 next/headers、node:crypto，
 * 好讓 middleware（edge runtime）與 route handler（node runtime）共用同一套驗證。
 * 秘鑰來自 AUTH_SECRET；缺失或過短一律拋錯 → 驗證端 catch 成「未登入」，fail-closed。
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "nttusp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天

export type SessionPayload = {
  sub: string; // User.id
  email: string;
  role: string; // admin / officer / viewer
  name?: string;
};

// 惰性讀取：build 期沒有 AUTH_SECRET 也不會炸，只有實際簽/驗時才要求。
function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET 未設定或過短（需 ≥16 字元）——請在 .env / Zeabur 環境變數設定。");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    // 簽章無效／過期／AUTH_SECRET 缺失 → 一律視為未登入。
    return null;
  }
}

export function sessionCookieOptions(maxAge: number = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
