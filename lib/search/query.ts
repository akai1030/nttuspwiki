/**
 * 全文查詢：查詢字串 → 斷詞 → tsquery（'simple'）→ tsv @@ query + ts_rank 排序。
 * 先 AND（精準），無結果再 OR（提召回）。片段（snippet）在應用端產生——因為 body 是無空白的中文，
 * PG 的 ts_headline 用 'simple' config 無法切中文，故自己在 JS 定位命中詞、取上下文。
 * 零 token、走免費層（CLAUDE.md 免費優先）。
 */
import { prisma } from "../db";
import { segmentForQuery } from "./segment";

export interface SearchHit {
  lawId: string;
  lawNumber: string;
  lawName: string;
  category: string;
  articleNumber: string;
  articleName: string | null;
  snippet: string;
  matched: string[];
  rank: number;
}

interface Row {
  lawId: string;
  lawNumber: string;
  lawName: string;
  category: string;
  articleNumber: string;
  articleName: string | null;
  body: string;
  rank: number;
}

/** 把 token 包成 tsquery lexeme：單引號包起、內部單引號跳脫（中文 token 幾乎不會有）。 */
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

async function runQuery(tsq: string, limit: number): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT a."lawId"        AS "lawId",
           l.number         AS "lawNumber",
           l.name           AS "lawName",
           l.category       AS "category",
           a.number         AS "articleNumber",
           a.name           AS "articleName",
           a.body           AS "body",
           ts_rank(a.tsv, query) AS "rank"
    FROM "Article" a
    JOIN "Law" l ON l.id = a."lawId",
         to_tsquery('simple', ${tsq}) query
    WHERE a.tsv @@ query
    ORDER BY "rank" DESC, l.number, a.number
    LIMIT ${limit}`;
}

export interface SearchResult {
  query: string;
  tokens: string[];
  mode: "and" | "or" | "empty";
  hits: SearchHit[];
}

export async function searchArticles(q: string, limit = 30): Promise<SearchResult> {
  const tokens = segmentForQuery(q);
  if (tokens.length === 0) return { query: q, tokens, mode: "empty", hits: [] };

  const lexemes = tokens.map(lexeme);
  let rows = await runQuery(lexemes.join(" & "), limit);
  let mode: "and" | "or" = "and";
  if (rows.length === 0 && tokens.length > 1) {
    rows = await runQuery(lexemes.join(" | "), limit);
    mode = "or";
  }

  const hits: SearchHit[] = rows.map((r) => {
    const { snippet, matched } = makeSnippet(r.body, tokens);
    return {
      lawId: r.lawId,
      lawNumber: r.lawNumber,
      lawName: r.lawName,
      category: r.category,
      articleNumber: r.articleNumber,
      articleName: r.articleName,
      snippet,
      matched,
      rank: Number(r.rank),
    };
  });
  return { query: q, tokens, mode, hits };
}
