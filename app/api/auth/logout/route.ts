import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout — 清除 session cookie。 */
export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
