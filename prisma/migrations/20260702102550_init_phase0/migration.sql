-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('RECURRING', 'RELATIVE', 'ABSOLUTE');

-- CreateTable
CREATE TABLE "Law" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "session" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "currentDate" TIMESTAMP(3),
    "currentType" TEXT,
    "preamble" TEXT,
    "sourceFile" TEXT,

    CONSTRAINT "Law_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "lawId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "chapter" TEXT,
    "body" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 20,
    "tsv" tsvector,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmendmentHistory" (
    "id" TEXT NOT NULL,
    "lawId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "roc" TEXT NOT NULL,
    "sessionTerm" TEXT,
    "action" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "AmendmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawReference" (
    "id" TEXT NOT NULL,
    "fromLawId" TEXT NOT NULL,
    "fromArticleNo" TEXT,
    "toLawName" TEXT NOT NULL,
    "toLawId" TEXT,
    "toArticleNo" TEXT,
    "kind" TEXT NOT NULL,
    "raw" TEXT NOT NULL,

    CONSTRAINT "LawReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleRule" (
    "id" TEXT NOT NULL,
    "lawId" TEXT NOT NULL,
    "articleNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "rrule" TEXT,
    "anchorEvent" TEXT,
    "offsetValue" INTEGER,
    "offsetUnit" TEXT,
    "direction" TEXT,
    "fixedMonth" INTEGER,
    "fixedDay" INTEGER,
    "audience" TEXT,
    "rawClause" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "anchorAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "ScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "target" TEXT,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "inputType" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mode" TEXT NOT NULL,
    "model" TEXT,
    "matchedArticles" JSONB NOT NULL,
    "ruleFlags" JSONB NOT NULL,
    "verdict" TEXT,
    "confidence" DOUBLE PRECISION,
    "citations" JSONB NOT NULL,
    "concerns" JSONB NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'officer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Law_category_idx" ON "Law"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Law_session_number_key" ON "Law"("session", "number");

-- CreateIndex
CREATE INDEX "Article_lawId_idx" ON "Article"("lawId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_lawId_number_key" ON "Article"("lawId", "number");

-- CreateIndex
CREATE INDEX "AmendmentHistory_lawId_idx" ON "AmendmentHistory"("lawId");

-- CreateIndex
CREATE INDEX "LawReference_fromLawId_idx" ON "LawReference"("fromLawId");

-- CreateIndex
CREATE INDEX "LawReference_toLawId_idx" ON "LawReference"("toLawId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_lawId_fkey" FOREIGN KEY ("lawId") REFERENCES "Law"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmendmentHistory" ADD CONSTRAINT "AmendmentHistory_lawId_fkey" FOREIGN KEY ("lawId") REFERENCES "Law"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_lawId_fkey" FOREIGN KEY ("lawId") REFERENCES "Law"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ScheduleRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ScheduleEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
