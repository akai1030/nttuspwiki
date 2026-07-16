-- 會議公開旗標：admin 逐場開，true 才出現在免登入公開頁。預設不公開，守個資/內部邊界。
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Meeting_isPublic_meetingAt_idx" ON "Meeting"("isPublic", "meetingAt");
