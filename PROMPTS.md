# PROMPTS.md · Claude Code 分階段實作腳本

> 用法：在 `nttuspwiki/` 底下開 Claude Code，**一個 Phase 一個 Phase** 把下面的區塊複製貼上。每個 Phase 結尾都有「做完 stop 讓我 review 再進下一個」。
> 順序依 `ARCHITECTURE.md` 第 3 節：資料層是地基 → 查詢 → 時程 → 檢核。設計 tokens 依 `DESIGN-SYSTEM.md`（設計方向鎖定後才有；未鎖定前先做 Phase 0，UI 等 tokens）。

---

## 前置：環境設定（作者手動，先備好）
- GitHub repo：`https://github.com/akai1030/nttuspwiki.git`（Phase 0-1 會連上）；Zeabur 專案（PostgreSQL）；Cloudflare R2 bucket。
- `.env`：`DATABASE_URL`、`R2_*`、（可選）`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`、`LINE_CHANNEL_*`、`GOOGLE_*`。
- 確認 Zeabur 的 PostgreSQL image 是否含 `pgvector`（不含也沒關係，語意層可暫緩，關鍵字查詢不受影響）。

---

## Phase 0 · 版本控制 + 專案初始化 + 灌種子 + 資料保真驗證

### 0-1 連到 GitHub（你會用 VSCode 開）
```
在 nttuspwiki/ 執行：
- git init（若尚未）
- 建 .gitignore：node_modules、.next、.env*、/uploads、*.log、.DS_Store（.env 與任何密鑰絕不追蹤）
- git remote add origin https://github.com/akai1030/nttuspwiki.git
  （若已有 origin：git remote set-url origin https://github.com/akai1030/nttuspwiki.git）
- git add -A && git commit -m "chore: init 專案規劃、設計、種子資料"
- git branch -M main && git push -u origin main
  （push 用你 VSCode 已登入的 GitHub 憑證；若遠端非空 → 先 git pull --rebase origin main 再 push）
做完 stop，確認遠端 repo 有東西再往下。
```

### 0-2 專案初始化
```
初始化 Next.js 14（App Router, TypeScript strict, Tailwind, ESLint）。
安裝並設定 Prisma，連 Zeabur PostgreSQL（DATABASE_URL 走 .env）。
依 ARCHITECTURE.md「1. 統一資料模型」建立 prisma/schema.prisma（Law/Article/AmendmentHistory/LawReference/ScheduleRule/ScheduleEvent/Reminder/ComplianceCheck/User）。
```

### 0-3 灌種子資料
```
寫 data/seed.ts：讀 法規MD轉檔/法規結構化-第20屆.json，映射灌進 Law/Article/AmendmentHistory
（欄位對應：category/number/name/current_date/current_type/preamble；articles[].number/name/chapter/items；amendment_history[].date/roc/action/text）。
跑 prisma migrate + seed。
```

### 0-4 資料保真驗證（★ Fable 5 重點：條文 PDF→JSON→DB→網站 不能轉錯）
```
寫 data/verify.ts 並執行，輸出報告到 data/verify-report.md：
1. 計數：法規 = 38 部、條文 = 733 條，且每部法規條數與 JSON 一致。
2. 逐條逐字比對：DB.Article.body === JSON 對應條文；列出所有不符的（法規, 條號）。
3. 健康檢查：掃 U+FFFD／亂碼、空白條文、條號跳號或重複、款項數異常。
4. 回源抽查：隨機抽 20 條，用原始 PDF（pdftotext；或 法規MD轉檔/parse_laws.py 同源）重抽比對，確認無解析漂移。
有任何出入 → 標記並 stop 問我，**絕不自行修改法條原文**（資料保真紅線）。
※ 本步把關「PDF→MD/JSON→DB」；至於「DB→網站顯示」的一致性，等 Phase 3 頁面完成後再驗一次（渲染出來的條文逐字 === DB）。
```
做完整個 Phase 0 stop，讓我 review 再進下一個。
排除：若 JSON 欄位與 schema 對不上，先列出差異問我，不要自行改法條內容。

---

## Phase 1 · Design tokens + 基礎 UI 元件
```
依 DESIGN-SYSTEM.md 建立 styles/tokens.css（色彩/字級/間距/圓角）與 Tailwind 設定對應。
建立核心元件：Button、Input/SearchBox、Tag（分類/狀態）、Card、LawRow（索引列）、ArticleBlock（條文塊）、AmendmentTimeline（沿革）、SectionHead（編號標頭）。
微文案集中在 lib/copy.ts。
做一頁 /styleguide 展示所有元件與 tokens。
做完 stop，讓我 review 再進下一個。
```
排除：不要硬編色碼/字級；不要引入 UI 套件庫；不要套 USWDS 內建外觀。

---

## Phase 2 · 資料層 + 中文全文檢索
```
lib/search：用 nodejieba 對每條 body 斷詞，寫入 Article.tsv（tsvector, 'simple' config）+ 建 GIN 索引。
建立 LawReference 抽取腳本：掃描條文抽「《法規》第X條」「準用」「牴觸」，建參照圖（能解析到語料內就連 toLawId）。
實作查詢 API：關鍵字（斷詞→tsvector）+ ts_rank 排序；回傳法規/條文/命中片段。
（可選）若 pgvector 可用：加 embedding 欄位與語意檢索，做關鍵字+語意混合排序。
做完 stop，讓我 review 再進下一個。
```

---

## Phase 3 · 公開查詢頁（Landing + 瀏覽 + 條文 + 搜尋）
```
公開路由（不需登入）：
- / 首頁：依 DESIGN-SYSTEM 的方向做（見 prototype/law-codex-v*.html）。
- /law 總覽：五類編排的索引（LawRow）。
- /law/[number] 單一法規：章/條/款項、修正沿革 timeline、參照可點跳轉（錨點 #art-N）。
- /search：全文搜尋結果頁（用 Phase 2 API）。
無障礙：語意標籤、鍵盤可達、對比達 AA。
做完 stop，讓我 review 再進下一個。
```

---

## Phase 4 · 幹部登入 + 時程管理與提醒
```
簡單 auth（email 白名單即可，幹部量小；勿上重型框架）。角色 admin/officer。
時程：
- ScheduleRule 半自動抽取：從條文抽時程草稿（RECURRING/RELATIVE/ABSOLUTE），後台人工確認 verified 才啟用。
- 錨定事件登記介面：幹部設「10月常會=10/15」→ 自動用 RELATIVE 規則往回/往後推算 ScheduleEvent（法定期限），每筆標法源條號。
- 站內時程看板 + 產生可訂閱 .ics feed（Google Calendar 訂閱）。
提醒 worker（Zeabur cron）：每日掃 Reminder.fireAt 到期 → 發送（站內；Email；LINE 群組 push via Messaging API）→ 標記 sentAt。
做完 stop，讓我 review 再進下一個。
```
排除：LINE 需作者先建 bot 並加進群組拿 group id；Google 寫入日曆若要 OAuth，先只做 .ics 訂閱。

---

## Phase 5 · 合法性檢核（雙層，免費優先）
```
Layer 1（免費、預設、先做）：
- 檢索對照：對輸入斷詞→撈相關條文（明文引用偵測 + tsvector 關鍵字 + LawReference 參照擴展），每條附命中理由與相關度，可點回原文。
- 規則引擎 lib/rules：把確定性門檻編成檢查（法律修正案需三讀、會長提案需連署、經費申請期限、預算不得增支…），對輸入標紅旗標。
- 檢核頁：上傳(R2)/貼上 → 顯示相關條文清單 + 規則旗標 + 免責，判定留給人；寫入 ComplianceCheck(mode=rule_only)。
Layer 2（可選加強）：
- lib/llm 抽象層，可切 Gemini Flash(免費) / Claude(付費, prompt caching)，環境變數可關。
- 把 Layer 1 相關條文塞 context → 產出結構化判定（符合/有疑慮/不符合/資料不足）+ 逐條引用 + 疑慮 + 信心度。
- 防幻覺：驗證每個被引用條號存在於 DB，對不上標紅。寫入 ComplianceCheck(mode=llm)。
做完 stop，讓我 review 再進下一個。
```
排除：LLM 層必須可關且不影響 Layer 1；不得輸出未驗證條號。

---

## Phase 6 · 上線前 QA + 部署
```
SEO：title/description/OG、robots、sitemap、canonical。
A11y：跑 WCAG AA 檢查、鍵盤 tab 順序、對比、screen reader 標籤。
安全：XSS（PDF/LLM 文字渲染邊界）、Prisma 參數化、R2 上傳限制、LLM rate limit、後台路由保護。
效能：Lighthouse、字體 preload、bundle。
部署到 Zeabur，設環境變數與 cron worker。
做完 stop，交我做最終驗收。
```

---

## 什麼時候該 stop 問我（不要自作主張）
1. 要裝禁止清單精神以外的相依（重型 auth/UI 框架）。
2. 種子 JSON 與 schema 對不上，或需要改動法條內容。
3. 範圍外功能（多語系、金流、跨屆 diff、對照表解析）。
4. 設計要偏離 DESIGN-SYSTEM.md。
5. 檢核要輸出確定法律判定、或 LLM 要產生無法驗證的引用。
6. 任何牽涉個資、對外發送（Email/LINE）、或會花錢（付費 LLM）的預設開關。
