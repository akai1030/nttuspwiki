-- 會議語意網址。可為 NULL：舊資料回填前仍以 cuid 開啟，查詢層以 OR 同時吃 slug 與 id。
-- Postgres 的 UNIQUE 視 NULL 互異，故多筆未回填列不會互相衝突。
ALTER TABLE "Meeting" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Meeting_slug_key" ON "Meeting"("slug");
