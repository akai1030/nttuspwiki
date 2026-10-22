# Coolify 部署設定

2026-10-22 起，本站跑在轉駅自己的主機（Contabo，日本東京機房），用 Coolify v4 管理，前面是 Cloudflare 代理；
網址是 `codex.transtation.org`（轉駅的 Cloudflare 加 DNS；之後買專用網域再換）。
合併進 `main` 由 GitHub 的 push webhook 觸發 Coolify 建置與部署。這份是這個服務在 Coolify 上的設定值。

## 建置與啟動

| 項目 | 值 |
|---|---|
| Build Pack | Nixpacks。環境變數加 `NIXPACKS_NODE_VERSION=22`（`package.json` 的 `engines` 寫的是 `>=22.12.0`，不釘的話 Nixpacks 可能挑別的版本） |
| Install | `npm ci` |
| Build | `npm run build`（`prisma generate && next build`，不連資料庫） |
| Start | `node node_modules/next/dist/bin/next start`（不經 npm，少一個常駐程序；讀 `PORT`，沒設就是 3000） |
| Ports Exposes | `3000` |
| 健康檢查 | 沒有專用端點。Coolify 用 `GET /robots.txt`（建置時產生的靜態檔，不碰資料庫） |
| 持久儲存 | 不用掛 |

版本號：`next.config.mjs` 在建置時把 commit 寫進 `NEXT_PUBLIC_BUILD_SHA`，依序讀 `SOURCE_COMMIT`（Coolify）→ 其他平台 → `git rev-parse`。
Coolify 只在 Advanced 打開 Include Source Commit in Build 時建置階段才有真的 commit；沒開時拿到的 `unknown` 會被略過、改讀 git。

## 資料庫

- **PostgreSQL 要有 pgvector**：`Article.embedding` 是 `vector(384)`（`prisma/migrations/20260703011447_add_article_embedding`）。
  Coolify 建資料庫時選有 pgvector 的映像（例如 `pgvector/pgvector:pg16`），不然還原時這一欄與它的 hnsw 索引會失敗。
- `DATABASE_URL` 用 Coolify 內部連線字串（內部網路不用 TLS，不要加 `sslmode=require`）。資料庫在同一台主機、不對外開放連線。
- 資料庫每日加密備份到 Cloudflare R2（每日之備份留 30 天、每週一份留 91 天）。
- **遷移不在建置時跑**（#12）。有新的 migration 時，部署完在 Coolify 這個服務的 Terminal 跑：

  ```sh
  ./node_modules/.bin/prisma migrate deploy
  ```

  用 node_modules 裡鎖定的 Prisma 6。不要用 `npx prisma`：本機沒找到時 npx 會抓最新版（Prisma 7），這個專案刻意不升 7。
  確認輸出寫 applied 再用新功能；沒有新 migration 的部署不用跑。
- 要確認遷移狀態，跑 `./node_modules/.bin/prisma migrate status`。

## 環境變數（只列名稱，值在 Coolify 後台）

建置時也要有的（Coolify 勾成建置時可用）：

- `SITE_URL`：設 `https://codex.transtation.org`。`app/robots.ts` 在建置時產生、`app/sitemap.ts` 在執行時讀，兩邊都要。沒設會退回程式裡的預設值（同一個網址）。
- `NIXPACKS_NODE_VERSION`：`22`

執行時：

- `DATABASE_URL`
- `AUTH_SECRET`（16 字以上）
- `ADMIN_EMAIL`、`ADMIN_PASSWORD`（環境變數引導的管理員登入）

## 排程

沒有。會前提醒只在後台產生草稿、人工送出（`lib/meetings/reminders.ts`），沒有 cron；
ARCHITECTURE.md（2026-07 的架構草案）寫的 cron worker 沒有實作。`.github/workflows/ci.yml` 只在 push／PR 時跑。

## 網域

- `codex.transtation.org` 指到 Coolify。寄出去的連結（會議通知、投票連結）用 `lib/site-origin.ts` 從請求的 Host 組，換網域後自動跟著換。
- 使用分析（PostHog）只在 `lib/posthog.ts` 的 `PROD_HOSTS` 裡的網域啟動，只有 `codex.transtation.org`。
- 舊網址已經停用，10/28 常會前通知議員新網址。
