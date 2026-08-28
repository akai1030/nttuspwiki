-- 議案類型（對應 data/vote-rules.json 的 id）。承辦擬案時選定，決定會中套用哪條法定表決方式。
-- nullable：既有提案一律為 NULL＝未指定，系統不回填、不代為歸類。
ALTER TABLE "Proposal" ADD COLUMN "matterType" TEXT;
