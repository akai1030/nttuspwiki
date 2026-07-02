import { NextRequest, NextResponse } from "next/server";
import { searchArticles, type SearchMode } from "@/lib/search/query";

const MODES: SearchMode[] = ["keyword", "semantic", "hybrid"];

// 需 Node runtime（讀字典檔 + Prisma + jieba），非 Edge。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=關鍵字&limit=30&mode=hybrid|keyword|semantic
 * 公開唯讀、零 API 費的全文檢索（CLAUDE.md 免費優先）。mode 預設 hybrid（關鍵字+語意 RRF）。
 * 回傳：{ query, tokens, mode, hits: [{ lawNumber, lawName, category, articleNumber, snippet, matched, score }] }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ query: "", tokens: [], mode: "hybrid", hits: [] });
  }
  const limitRaw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 30;
  const modeRaw = req.nextUrl.searchParams.get("mode") as SearchMode | null;
  const mode: SearchMode = modeRaw && MODES.includes(modeRaw) ? modeRaw : "hybrid";

  try {
    const result = await searchArticles(q, limit, mode);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/search]", e);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
