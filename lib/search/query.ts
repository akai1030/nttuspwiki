/**
 * 全文查詢（關鍵字 + 語意，混合排序）。
 * - keyword：斷詞 → tsquery（'simple'）→ tsv @@ query，ts_rank 排序（先 AND 精準，無果再 OR 召回）。
 * - semantic：查詢向量（@xenova e5-small）→ embedding <=> 向量（cosine 距離）排序。
 * - hybrid（預設）：兩路各取候選，用 Reciprocal Rank Fusion（RRF）融合排序。
 * 片段（snippet）在應用端定位命中詞（ts_headline 無法切中文）。全程零 API 費、離線（CLAUDE.md 免費優先）。
 */
import { prisma } from "../db";
import { segmentForQuery } from "./segment";
import { embedQuery, toVectorLiteral } from "./embed";

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

async function semanticCandidates(q: string, limit: number): Promise<Scored[]> {
  const qv = toVectorLiteral(await embedQuery(q));
  const rows = await prisma.$queryRawUnsafe<Scored[]>(
    `SELECT id, 1 - (embedding <=> $1::vector) AS score
     FROM "Article" WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector LIMIT $2`,
    qv,
    limit
  );
  return rows.map((r) => ({ id: r.id, score: Number(r.score) }));
}

/** Reciprocal Rank Fusion：融合多個排名（依名次，不依原始分數尺度）。 */
function rrf(lists: Scored[][], k = 60): Scored[] {
  const acc = new Map<string, number>();
  for (const list of lists) {
    list.forEach((r, i) => acc.set(r.id, (acc.get(r.id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...acc.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}

export async function searchArticles(
  q: string,
  limit = 30,
  mode: SearchMode = "hybrid"
): Promise<SearchResult> {
  const tokens = segmentForQuery(q);
  if (!q.trim()) return { query: q, tokens, mode, hits: [] };

  const POOL = Math.max(limit, 50);
  let ordered: Scored[];
  if (mode === "keyword") {
    ordered = (await keywordCandidates(tokens, limit)).slice(0, limit);
  } else if (mode === "semantic") {
    ordered = (await semanticCandidates(q, limit)).slice(0, limit);
  } else {
    const [kw, sem] = await Promise.all([
      keywordCandidates(tokens, POOL),
      semanticCandidates(q, POOL),
    ]);
    ordered = rrf([kw, sem]).slice(0, limit);
  }
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
