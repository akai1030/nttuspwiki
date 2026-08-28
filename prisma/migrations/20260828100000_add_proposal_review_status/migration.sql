-- 程序委員會審核狀態（2.3 §9② 應先送程序委員會）。
-- 既有列一律 pending，而議程只排除 rejected，故現有議程輸出不變。
ALTER TABLE "Proposal" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending';
