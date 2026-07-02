-- Phase 2 語意檢索（可選層）：Article.embedding = @xenova multilingual-e5-small（384 維）。
-- 由應用端算向量後寫入（見 lib/search/build-embeddings.ts）；查詢用 <=> cosine 距離。
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "embedding" vector(384);
CREATE INDEX IF NOT EXISTS "Article_embedding_idx" ON "Article" USING hnsw ("embedding" vector_cosine_ops);
