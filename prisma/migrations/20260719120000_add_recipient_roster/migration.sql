-- 議員名冊：Recipient 增列 選區/科系/年級/學號/手機（皆可空，非議員之列席/旁聽/祕書處留空）。
-- 皆屬個資，永不進公開路由（沿用會議營運模組邊界）。既有資料不受影響（新欄位皆 NULL）。

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "district" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "studentId" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
-- 同屆同學號唯一，供冪等匯入；studentId 為 NULL 的非議員列不受限（PG 視多個 NULL 互異）。
CREATE UNIQUE INDEX "Recipient_session_studentId_key" ON "Recipient"("session", "studentId");
