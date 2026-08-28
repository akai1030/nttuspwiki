-- 現場議事狀態。全部 nullable／預設 false，既有會議行為完全不變。
-- 狀態一律由人操作推進（主席／祕書），系統不以時鐘自動改變任何一欄。
ALTER TABLE "Meeting" ADD COLUMN "liveOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN "liveProposalId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "livePresent" INTEGER;
ALTER TABLE "Meeting" ADD COLUMN "liveTotal" INTEGER;
ALTER TABLE "Meeting" ADD COLUMN "liveTotalBasis" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "liveNote" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "liveUpdatedAt" TIMESTAMP(3);
