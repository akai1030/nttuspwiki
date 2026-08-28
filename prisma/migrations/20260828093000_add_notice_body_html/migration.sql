-- 通知內文的 Gmail 相容 HTML 版。可為 NULL：既有通知照舊只有純文字，讀取行為不變。
ALTER TABLE "MeetingNotice" ADD COLUMN "bodyHtml" TEXT;
