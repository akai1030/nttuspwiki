import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { copy } from "@/lib/copy";

// Prisma + scrypt 需 Node runtime；讀 cookie/DB 一律 runtime。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 白名單 email 未命中時仍跑一次雜湊，拉平回應時間，避免以時序探測「哪些 email 是幹部」。
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  return (dummyHashPromise ??= hashPassword("nttusp-not-a-real-account-placeholder"));
}

// 常數時間字串比對（env 管理員密碼用）。
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// env 引導管理員：在 Zeabur 設 ADMIN_EMAIL / ADMIN_PASSWORD 即可登入（密碼好找、好改）。
// 命中則確保 DB 有這位 admin（upsert），再種 session。未設兩者則停用本機制。
async function tryEnvAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return null;
  if (email !== adminEmail || !safeEqual(password, adminPassword)) return null;
  return prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin" },
    create: { email: adminEmail, role: "admin", name: "管理員" },
  });
}

/**
 * POST /api/auth/login  body: { email, password }
 * email 白名單（User 表）+ scrypt 密碼比對 → 成功則種下簽章 session cookie。
 * 錯誤一律回同一句 generic 訊息，不洩漏 email 是否存在（CLAUDE.md 公開/私密邊界）。
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const raw = (body ?? {}) as Record<string, unknown>;
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: copy.login.form.errorMissing }, { status: 400 });
  }

  try {
    // 先試 env 引導管理員（密碼設在環境變數，Zeabur 好找好改）。
    const envAdmin = await tryEnvAdmin(email, password);
    if (envAdmin) {
      await createSession(envAdmin);
      await prisma.user.update({ where: { id: envAdmin.id }, data: { lastLoginAt: new Date() } });
      return NextResponse.json({ ok: true, role: envAdmin.role });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));

    if (!user || !user.passwordHash || !ok) {
      return NextResponse.json({ error: copy.login.form.errorInvalid }, { status: 401 });
    }

    await createSession(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    console.error("[/api/auth/login]", e);
    return NextResponse.json({ error: copy.login.form.errorServer }, { status: 500 });
  }
}
