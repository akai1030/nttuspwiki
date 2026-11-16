# Coolify 部署設定

2026-10-22 起，本站跑在轉駅自己的主機（Contabo，日本東京機房），用 Coolify v4 管理，前面是 Cloudflare 代理；
網址是 `nttuspcodex.transtation.org`（2026-11-09 起；轉駅的 Cloudflare 加 DNS；之後買專用網域再換）。
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

- `SITE_URL`：設 `https://nttuspcodex.transtation.org`。`app/robots.ts` 在建置時產生、`app/sitemap.ts` 在執行時讀，兩邊都要。沒設會退回程式裡的預設值（同一個網址）。
- `NIXPACKS_NODE_VERSION`：`22`

執行時：

- `DATABASE_URL`
- `AUTH_SECRET`（16 字以上）
- `ADMIN_EMAIL`、`ADMIN_PASSWORD`（環境變數引導的管理員登入）
- `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`（LINE 會前提醒，可選；兩個都有才啟用，見下方「排程」）
- `LINE_CRON_SECRET`（排程呼叫 `/api/line/dispatch` 的密鑰，16 字以上；沒設＝排程端點關閉）

## 排程

只有一支：LINE 會前提醒（2026-11 起，`lib/line/`）。設在這個服務的 Scheduled Tasks：

| 項目 | 值 |
|---|---|
| Name | `line-reminders` |
| Command | `node scripts/line-dispatch.mjs` |
| Frequency | `*/15 * * * *`（每小時 :00、:15、:30、:45） |
| Container | 留空（就是網站本身的容器） |

腳本從容器內部打 `http://127.0.0.1:$PORT/api/line/dispatch`，帶 `LINE_CRON_SECRET`。到期、還沒發的提醒推到後台 `/console/line` 選定的群組，
發完寫入 `sentAt`；重跑、兩支同時跑都不會重發（`lib/line/dispatch.ts` 檔頭）。執行紀錄每次一行 JSON：`sent`／`skipped`／`failed` 各幾則。
沒設 `LINE_CRON_SECRET` 時腳本直接結束（結束碼 1）；token 或 secret 沒設時端點回 `{"status":"disabled"}`，沒選群組時回 `{"status":"no-group"}`，都不發任何訊息。

Email 照舊只生草稿、人工寄出，沒有排程。`.github/workflows/ci.yml` 只在 push／PR 時跑。

## 網域

- `nttuspcodex.transtation.org` 與 `codex.transtation.org` 都指到 Coolify（Coolify 的網域欄兩個都填，nttuspcodex 排第一）。`codex` 是 10/22～11/9 的網址，`next.config.mjs` 的 `redirects()` 把它整站 308 轉到 `nttuspcodex`，路徑與查詢字串照帶；已寄出的通知與投票連結因此還能用。兩個網域的登入 cookie 不共用，換網域後幹部要重新登入一次。寄出去的連結（會議通知、投票連結）用 `lib/site-origin.ts` 從請求的 Host 組，換網域後自動跟著換。
- 使用分析（PostHog）只在 `lib/posthog.ts` 的 `PROD_HOSTS` 裡的網域啟動，只有 `nttuspcodex.transtation.org`（轉址前的 `codex` 不會載入網頁，不必列）。
- 舊網址已經停用，10/28 常會前通知議員新網址。
