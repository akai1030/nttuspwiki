-- 線上表決。新增欄位皆 nullable 或有預設值，既有會議與名冊行為不變。
-- 無記名表決不寫 VoteBallot：資料庫裡沒有任何一列記著「誰投了哪一項」。
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "liveAttendeeIds" JSONB;

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "voteLinkVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "proposalId" TEXT,
    "kind" TEXT NOT NULL,
    "secret" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "seats" INTEGER,
    "matterType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "eligibleIds" JSONB NOT NULL,
    "openedById" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteOption" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteVoter" (
    "voteId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "VoteVoter_pkey" PRIMARY KEY ("voteId","recipientId")
);

-- CreateTable
CREATE TABLE "VoteBallot" (
    "voteId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "VoteBallot_pkey" PRIMARY KEY ("voteId","recipientId")
);

-- CreateIndex
CREATE INDEX "Vote_meetingId_idx" ON "Vote"("meetingId");

-- CreateIndex
CREATE INDEX "VoteOption_voteId_idx" ON "VoteOption"("voteId");

-- CreateIndex
CREATE INDEX "VoteBallot_optionId_idx" ON "VoteBallot"("optionId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteOption" ADD CONSTRAINT "VoteOption_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteVoter" ADD CONSTRAINT "VoteVoter_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "VoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

