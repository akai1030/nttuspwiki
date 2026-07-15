-- Phase 4 幹部登入：User 加密碼雜湊與最後登入時間。
-- passwordHash 走 lib/auth/password.ts 的 scrypt（node 內建，零外部相依）；null＝白名單已建但未設密碼、不得登入。
-- 加性、可重入（IF NOT EXISTS），不動既有 768 條資料。
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
