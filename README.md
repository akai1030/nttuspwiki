# 學生議會數位法典暨議事系統

國立臺東大學學生議會使用的法規查詢與議事系統。程式碼以 MIT 授權公開，其他學校的學生議會可自行架設，換上自己的法規、議事規則與通知格式後使用。

- 正式站：<https://nttuspcodex.transtation.org>
- 系統說明（給其他學校議會）：<https://nttuspcodex.transtation.org/open-source>

## 功能

- **法規查詢**：全文檢索（中文斷詞）、條文間的參照可點擊跳轉、修正沿革逐筆列出。條文由原始 PDF 解析匯入，不改寫。
- **議事公開頁**：會議時間、議程、決議與表決結果。開會時另有即時看板，並列出各法規訂定的法定時程。
- **議會後台**：會議、名冊、帳號管理與使用說明。後台需登入，資料不對外公開。
- **線上表決**：議員以學號及手機末四碼登入，或使用專屬投票連結。記名投票公開每人的投票內容，無記名投票只公開票數。各類議案的表決方式與通過門檻依法規設定。

法規查詢、議事與表決都不呼叫 AI，不需要付費的 AI 服務。

## 會議五步

後台每場會議分五個分頁，依序進行：

1. **會議資料**：建立會議後，系統依會議時間往回推出籌備時程與法定期限。
2. **寄開會通知**：產生開會通知單與收件人清單，由祕書處從官方信箱寄出，系統不代寄。
3. **提案與議程**：登錄提案，經程序委員會審定排序後產生議程，以及含議程的會議通知。
4. **開會**：點名、宣告議程進度、線上表決、主席公告，畫面同步到公開看板。
5. **會後**：補齊決議、設定議事公開頁、結案。

操作細節在後台的「使用說明」頁（`/console/meetings/guide`，內容在 `lib/copy.ts` 的 `meetings.vote.guide`）。

## 技術

- Next.js 16（App Router）、React 19、TypeScript、Tailwind CSS 3
- PostgreSQL 16 ＋ pgvector、Prisma 6
- 中文斷詞用 nodejieba，全文檢索用 PostgreSQL 的 `tsvector`

Prisma 刻意停在 6，不升 7（理由見 `CLAUDE.md`）。

## 架設

需要 Node.js 22.12 以上，以及裝有 pgvector 擴充的 PostgreSQL（例如 Docker 映像 `pgvector/pgvector:pg16`）。

1. 安裝套件，複製環境變數範本：

   ```sh
   npm ci
   cp .env.example .env
   ```

   `.env` 至少要填 `DATABASE_URL`、`AUTH_SECRET`（16 字以上的亂數）、`ADMIN_EMAIL`、`ADMIN_PASSWORD`。其餘欄位是選用功能，可留空。

2. 在資料庫啟用 pgvector。遷移檔不會自己建立這個擴充，沒有先建會在 `add_article_embedding` 這一步失敗：

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. 建資料表、匯入法規、建參照與檢索索引：

   ```sh
   ./node_modules/.bin/prisma migrate deploy
   npm run db:seed
   npm run refs:build
   npm run search:index
   npm run db:verify
   ```

   請用 `node_modules` 裡的 Prisma。用 `npx prisma` 時，本機找不到會下載最新版（7）。

4. 啟動：

   ```sh
   npm run dev
   ```

   用 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 登入 `/login`。要先試用議事功能，可跑 `npm run demo:seed` 建一場示範會議（`npm run demo:drop` 刪除）。

正式環境的建置與部署設定（以 Coolify 為例）見 `docs/coolify.md`。

## 改編成自己議會的系統

| 項目 | 位置 | 說明 |
|---|---|---|
| 法規資料 | `法規MD轉檔/`、`data/shared.ts` | 以 `parse_laws.py` 解析自己議會的法規 PDF（用法與檔名格式見該程式檔頭），把 `data/shared.ts` 的 `JSON_PATH` 改成輸出的 JSON，再以 `npm run db:seed` 匯入。匯入前請人工校對條號、日期與數字。 |
| 議案表決規則 | `data/vote-rules.json` | 各類議案的表決方式、通過門檻與法源條文。`npm run verify:vote-rules` 會逐字核對引文與法規原文。 |
| 籌備期限 | `lib/meetings/timeline.ts` | 寄開會通知、函送議程等期限的天數與法源。 |
| 法定時程 | `data/statutory-schedule.json` | 公開頁「法定時程」列出的條文與期限。 |
| 開會通知格式 | `lib/meetings/notice.ts` | 通知單版面與發文字號格式。 |
| 校名與介面文字 | `lib/copy.ts` | 全站文字集中在此檔。 |
| 網址與網站分析 | `lib/posthog.ts`、`next.config.mjs` | 網址轉址與 PostHog 設定，請移除或換成自己的。 |
| 外觀 | `design/tokens.json`、`styles/tokens.css` | 顏色、字級與間距，不改也可使用。規則見 `DESIGN.md`。 |

修改畫面後請跑 `npm run design:check`，它會擋下寫死的顏色、字級與間距。

## 文件

- `CLAUDE.md`：開發守則（資料保真、公開與後台的邊界、禁止事項）
- `ARCHITECTURE.md`：資料模型與架構
- `MEETINGS-MODULE.md`：議事模組
- `DESIGN.md`、`DESIGN-SYSTEM.md`：設計規範

## 授權

程式碼採 MIT 授權（見 `LICENSE`）：可自由使用、修改、再散布，包含商業用途，但須保留原著作權與授權聲明。本軟體不提供任何擔保。

原始碼庫內的法規文字與示範資料取自國立臺東大學學生會的自治法規，改編時請換成自己議會的資料。表決方式與通過門檻由各議會自行設定，設定是否符合自己的法規，請由議會自行確認。
