-- Phase 2 全文檢索：Article.tsv（tsvector, 'simple' config）的 GIN 索引。
-- tsv 由應用端 nodejieba/@node-rs/jieba 斷詞後以 to_tsvector('simple', …) 寫入（見 lib/search/build-index.ts）。
CREATE INDEX IF NOT EXISTS "Article_tsv_idx" ON "Article" USING GIN ("tsv");
