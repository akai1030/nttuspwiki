-- Phase 4 會議營運模組（見 MEETINGS-MODULE.md）：會議、提案、議程、收件人、通知、提醒。
-- 全新表，不動既有法規/使用者資料。

-- CreateEnum
CREATE TYPE "MeetingKind" AS ENUM ('REGULAR', 'SPECIAL', 'COMMITTEE');
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'NOTICED', 'HELD', 'CLOSED');

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "session" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MeetingKind" NOT NULL DEFAULT 'REGULAR',
    "meetingAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "docNumber" TEXT,
    "proposalDeadline" TIMESTAMP(3),
    "notes" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "proposer" TEXT,
    "explanation" TEXT,
    "resolution" TEXT,
    "fileUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "proposalId" TEXT,
    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "session" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleTag" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingNotice" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "recipientIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingReminder" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'inapp',
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "MeetingReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_session_meetingAt_idx" ON "Meeting"("session", "meetingAt");
CREATE INDEX "Proposal_meetingId_idx" ON "Proposal"("meetingId");
CREATE INDEX "AgendaItem_meetingId_idx" ON "AgendaItem"("meetingId");
CREATE INDEX "Recipient_session_active_idx" ON "Recipient"("session", "active");
CREATE INDEX "MeetingNotice_meetingId_idx" ON "MeetingNotice"("meetingId");
CREATE INDEX "MeetingReminder_fireAt_idx" ON "MeetingReminder"("fireAt");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingNotice" ADD CONSTRAINT "MeetingNotice_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingReminder" ADD CONSTRAINT "MeetingReminder_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
