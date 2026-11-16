-- AlterTable
ALTER TABLE "MeetingReminder" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lineRequestId" TEXT,
ADD COLUMN     "sentVia" TEXT;

-- CreateTable
CREATE TABLE "LineGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedAt" TIMESTAMP(3),
    "selectedBy" TEXT,

    CONSTRAINT "LineGroup_pkey" PRIMARY KEY ("id")
);

