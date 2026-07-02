import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/search/query";

// 需 Node runtime（讀字典檔 + Prisma + jieba），非 Edge。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=關鍵字&limit=30
 * 公開唯讀、零 token 的全文檢索（CLAUDE.md 免費優先）。
 * 回傳：{ query, tokens, mode: and|or|empty, hits: [{ lawNumber, lawName, category, articleNumber, snippet, matched, rank }] }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ query: "", tokens: [], mode: "empty", hits: [] });
  }
  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;

  try {
    const result = await searchArticles(q, limit);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/search]", e);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
