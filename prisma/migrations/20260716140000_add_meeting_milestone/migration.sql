-- 會議自訂里程碑（各委員會時間、其他籌備時程），併入籌備時間軸。
CREATE TABLE "MeetingMilestone" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MeetingMilestone_meetingId_idx" ON "MeetingMilestone"("meetingId");

ALTER TABLE "MeetingMilestone" ADD CONSTRAINT "MeetingMilestone_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
