# Coolify 部署設定

2026-10-24 晚上從 Zeabur 搬到自己的主機（Coolify v4），網址同時換成 `codex.transtation.org`
（轉駅的 Cloudflare 加 DNS；之後買專用網域再換）。這份是在 Coolify 建這個服務時要填的值。
切換前 Zeabur 照舊在跑，兩邊用的是同一份程式。

## 建置與啟動

| 項目 | 值 |
|---|---|
| Build Pack | Nixpacks。環境變數加 `NIXPACKS_NODE_VERSION=22`（`package.json` 的 `engines` 寫的是 `>=22.12.0`，不釘的話 Nixpacks 可能挑別的版本；Zeabur 是 `zbpack.json` 釘 22） |
| Install | `npm ci` |
| Build | `npm run build`（`prisma generate && next build`，不連資料庫） |
| Start | `node node_modules/next/dist/bin/next start`（跟 `zbpack.json` 一樣，不經 npm，少一個常駐程序；讀 `PORT`，沒設就是 3000） |
| Ports Exposes | `3000` |
| 健康檢查 | 沒有專用端點。Coolify 用 `GET /robots.txt`（建置時產生的靜態檔，不碰資料庫） |
| 持久儲存 | 不用掛 |

版本號：`next.config.mjs` 在建置時把 commit 寫進 `NEXT_PUBLIC_BUILD_SHA`，依序讀 `SOURCE_COMMIT`（Coolify）→ `ZEABUR_GIT_COMMIT_SHA` → 其他平台 → `git rev-parse`。
Coolify 只在 Advanced 打開 Include Source Commit in Build 時建置階段才有真的 commit；沒開時拿到的 `unknown` 會被略過、改讀 git。

## 資料庫

- **PostgreSQL 要有 pgvector**：`Article.embedding` 是 `vector(384)`（`prisma/migrations/20260703011447_add_article_embedding`）。
  Coolify 建資料庫時選有 pgvector 的映像（例如 `pgvector/pgvector:pg16`，大版本跟 Zeabur 那台一樣），不然還原時這一欄與它的 hnsw 索引會失敗。
- `DATABASE_URL` 用 Coolify 內部連線字串（內部網路不用 TLS，不要加 `sslmode=require`）。
- **遷移不在建置時跑**（#12）。有新的 migration 時，部署完在 Coolify 這個服務的 Terminal 跑：

  ```sh
  ./node_modules/.bin/prisma migrate deploy
  ```

  用 node_modules 裡鎖定的 Prisma 6。不要用 `npx prisma`：本機沒找到時 npx 會抓最新版（Prisma 7），這個專案刻意不升 7。
  確認輸出寫 applied 再用新功能；沒有新 migration 的部署不用跑。
- 切換當晚從 Zeabur 匯入後跑一次 `./node_modules/.bin/prisma migrate status`，應該是全部已套用。

## 環境變數（只列名稱，值從 Zeabur 搬）

建置時也要有的（Coolify 勾成建置時可用）：

- `SITE_URL`：設 `https://codex.transtation.org`。`app/robots.ts` 在建置時產生、`app/sitemap.ts` 在執行時讀，兩邊都要。沒設會退回舊的 `https://nttuspcodex.zeabur.app`。
- `NIXPACKS_NODE_VERSION`：`22`

執行時：

- `DATABASE_URL`
- `AUTH_SECRET`（16 字以上）
- `ADMIN_EMAIL`、`ADMIN_PASSWORD`（環境變數引導的管理員登入）

## 排程

沒有。會前提醒只在後台產生草稿、人工送出（`lib/meetings/reminders.ts`），沒有 cron；
CLAUDE.md、ARCHITECTURE.md 寫的「Zeabur cron worker」沒有實作。`.github/workflows/ci.yml` 只在 push／PR 時跑。

## 網域

- `codex.transtation.org` 指到 Coolify。寄出去的連結（會議通知、投票連結）用 `lib/site-origin.ts` 從請求的 Host 組，換網域後自動跟著換。
- 使用分析（PostHog）只在 `lib/posthog.ts` 的 `PROD_HOSTS` 裡的網域啟動，已經加了 `codex.transtation.org`。
- `nttuspcodex.zeabur.app` 由 Zeabur 端改成 308 轉到新網址，留到 Zeabur 收尾（搬遷規劃）。10/28 常會前通知議員新網址。

## 切換後要刪的 Zeabur 設定（另開 PR）

- `zbpack.json`。
- `next.config.mjs` 的 `ZEABUR_GIT_COMMIT_SHA`（留著無害）、HSTS 註解裡的 zeabur.app。
- `lib/posthog.ts` 的 `nttuspcodex.zeabur.app`（Zeabur 關站後）。
- `app/robots.ts`、`app/sitemap.ts` 的預設網址改成新網域。
- CLAUDE.md「技術棧」「資料庫遷移」、`.env.example`、ARCHITECTURE.md、PROMPTS.md 裡的 Zeabur；
  `app/(public)/page.tsx`、`app/api/auth/login/route.ts`、`lib/auth/token.ts`（錯誤訊息「請在 .env / Zeabur 環境變數設定」）、`lib/site-origin.ts`、`lib/search/embed.ts`、`components/AutoRefresh.tsx`、`components/PrintButton.tsx` 的註解。
