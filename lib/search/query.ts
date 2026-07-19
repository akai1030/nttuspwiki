/**
 * 全文查詢（關鍵字：斷詞 → tsquery('simple') → tsv @@ query，ts_rank 排序）。
 * 先 AND 精準，無果再 OR 召回。片段（snippet）在應用端定位命中詞（ts_headline 無法切中文）。
 * 全程零 API 費、離線（CLAUDE.md 免費優先）。
 *
 * 註：語意層（pgvector + @xenova 本地模型）暫自部署切離以縮小 image（onnxruntime ~1GB）。
 *     758 條向量仍存於 `Article.embedding`（1.10 於 115.05.18 修法換條後，其 14 條待 `npm run search:embed` 補）；日後接雲端 embedding（取查詢向量）即可復用，
 *     參考保留於 `lib/search/embed.ts`（已於 tsconfig 排除、不進 build）。
 */
import { prisma } from "../db";
import { segmentForQuery } from "./segment";

export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface SearchHit {
  lawId: string;
  lawNumber: string;
  lawName: string;
  category: string;
  articleNumber: string;
  articleName: string | null;
  snippet: string;
  matched: string[];
  score: number;
}

export interface SearchResult {
  query: string;
  tokens: string[];
  mode: SearchMode;
  hits: SearchHit[];
}

interface Scored {
  id: string;
  score: number;
}

/** token → tsquery lexeme（單引號包、跳脫內部單引號）。 */
function lexeme(tok: string): string {
  return "'" + tok.replace(/'/g, "''") + "'";
}

function makeSnippet(body: string, tokens: string[], radius = 24): { snippet: string; matched: string[] } {
  const matched = tokens.filter((t) => body.includes(t));
  let pos = -1;
  let len = 0;
  for (const t of matched) {
    const i = body.indexOf(t);
    if (i >= 0 && (pos < 0 || i < pos)) {
      pos = i;
      len = t.length;
    }
  }
  if (pos < 0) {
    const head = body.slice(0, radius * 2);
    return { snippet: head + (body.length > head.length ? "…" : ""), matched };
  }
  const start = Math.max(0, pos - radius);
  const end = Math.min(body.length, pos + len + radius);
  const snippet = (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
  return { snippet, matched };
}

async function keywordCandidates(tokens: string[], limit: number): Promise<Scored[]> {
  if (tokens.length === 0) return [];
  const lex = tokens.map(lexeme);
  const run = (op: string) =>
    prisma.$queryRawUnsafe<Scored[]>(
      `SELECT a.id AS id, ts_rank(a.tsv, q) AS score
       FROM "Article" a, to_tsquery('simple', $1) q
       WHERE a.tsv @@ q ORDER BY score DESC LIMIT $2`,
      lex.join(op),
      limit
    );
  let rows = await run(" & ");
  if (rows.length === 0 && tokens.length > 1) rows = await run(" | ");
  return rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/**
 * 目前一律走關鍵字層（免費、離線、預設）。mode 參數保留供 API 相容；語意/hybrid 尚未於部署啟用，
 * 一併以關鍵字結果回應（日後接雲端 embedding 再恢復語意路徑）。
 */
export async function searchArticles(
  q: string,
  limit = 30,
  mode: SearchMode = "keyword"
): Promise<SearchResult> {
  const tokens = segmentForQuery(q);
  if (!q.trim()) return { query: q, tokens, mode, hits: [] };

  const ordered = (await keywordCandidates(tokens, limit)).slice(0, limit);
  if (ordered.length === 0) return { query: q, tokens, mode, hits: [] };

  const ids = ordered.map((o) => o.id);
  const arts = await prisma.article.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      number: true,
      name: true,
      body: true,
      law: { select: { id: true, number: true, name: true, category: true } },
    },
  });
  const byId = new Map(arts.map((a) => [a.id, a]));

  const hits: SearchHit[] = ordered
    .map((o) => {
      const a = byId.get(o.id);
      if (!a) return null;
      const { snippet, matched } = makeSnippet(a.body, tokens);
      return {
        lawId: a.law.id,
        lawNumber: a.law.number,
        lawName: a.law.name,
        category: a.law.category,
        articleNumber: a.number,
        articleName: a.name,
        snippet,
        matched,
        score: o.score,
      };
    })
    .filter((h): h is SearchHit => h !== null);

  return { query: q, tokens, mode, hits };
}
