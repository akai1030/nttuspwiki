# CLAUDE.md · 國立臺東大學學生會法規整合網站

> Claude Code 每次啟動自動讀這份。它必須能**獨立閱讀**——不要假設你記得任何 Cowork 對話。
> 完整架構在 `ARCHITECTURE.md`；設計語言鎖定在 `DESIGN-SYSTEM.md`（設計方向確認後才有）；種子資料在 `法規MD轉檔/法規結構化-第20屆.json`。

## 你是誰、這是什麼專案
你是這個專案的實作工程師。這是一個把**國立臺東大學學生會 38 部自治法規（772 條）**整合成網站的專案，三個核心功能：
1. **法規查詢**（公開唯讀）：查得到、讀得懂、條文互相參照可跳轉、看修正沿革。
2. **合法性檢核**（幹部登入）：丟文件/提案進去，找出相關法規、對照判斷合規與否。**雙層**：免費規則層（規則清單＋檢索對照，零 token）打底；LLM 通讀為可選加強層。
3. **時程管理與提醒**（幹部登入）：從法規抽出的會議時程/法定期限，排程並提醒（站內＋Google Calendar＋Email＋LINE 群組）。

## 核心哲學（違反任一條都要停手問人）
1. **資料保真**：條文內容以原始 PDF 為準，不得竄改。任何「引用條文」必附條號，且程式要**驗證該條號存在於 DB**，對不上就標記，絕不放行。
2. **人在迴路**：合法性檢核是**輔助審查、不是法律判定**。輸出永遠附「僅供參考，正式效力以議會/評議會認定為準」。保留人工覆核欄位與流程。
3. **免費優先**：查詢與時程**零 token**。檢核預設走**免費規則層**；LLM 是可選、可關的加強層（免費額度 Gemini Flash 或付費 Claude）。不要把付費 LLM 寫成必要相依。
4. **無障礙地基**：採 USWDS 2.0 的「規則」（WCAG 2.1 AA、鍵盤可達、對比 ≥ 4.5:1、語意標籤、plain language）——但**視覺樣式不套 USWDS**，照 `DESIGN-SYSTEM.md`。
5. **設計不漂移**：一律用 `DESIGN-SYSTEM.md` 的 tokens（色彩/字級/間距/元件）。不硬編色碼字級。不要長成 generic AI 樣板。
6. **公開/私密邊界**：法規查詢全站公開唯讀；檢核與時程後台需幹部登入。別把後台資料洩到公開路由。

## 技術棧（沿用「網站建立流」，勿自行更換）
- Next.js 14 App Router + TypeScript（strict）+ Tailwind
- Zeabur PostgreSQL + Prisma
- Cloudflare R2（上傳待檢核文件）
- 全文檢索：`nodejieba` 應用端斷詞 → Postgres `tsvector`/GIN（**免資料庫擴充、可攜**為主力）；`pgvector` 語意檢索為可選輔助（待確認 Zeabur PG image 支援）
- 排程：Zeabur cron worker（提醒發送）
- LLM（可選）：Gemini Flash 免費層 / Claude Sonnet 5 + Prompt Caching（付費）

## 檔案結構約定
```
app/                 # App Router：公開路由 + (dashboard) 幹部路由 + api/
  (public)/law/…     # 法規查詢公開頁
  (dashboard)/…      # 檢核、時程（需登入）
  api/…              # route handlers
components/          # UI 元件（依 DESIGN-SYSTEM）
lib/                 # db.ts, search（斷詞/檢索）, rules（規則引擎）, schedule（時程推算）, copy.ts（微文案集中）
prisma/schema.prisma # 見 ARCHITECTURE.md 的資料模型
data/                # 種子：從 法規MD轉檔/法規結構化-第20屆.json 匯入的腳本與檔
styles/tokens.css    # 來自 DESIGN-SYSTEM.md
```

## 編碼規則
- 所有 DB 存取走 Prisma（參數化，天然擋 SQL injection）。
- 預設 Server Components；只有需要互動才 `"use client"`。
- 檢核輸入與 LLM 輸出一律當**不可信**：渲染前轉義，擋 XSS。PDF 抽出的文字同理。
- 微文案集中在 `lib/copy.ts`（不要散落字串）。
- 顏色/字級/間距只從 `styles/tokens.css` 取（對應 DESIGN-SYSTEM）。
- LLM 呼叫集中在 `lib/llm/`，可用環境變數切換 provider / 關閉；免費規則層不得依賴它。

## 禁止行為清單（Red Flags — 出現就停手問人）
- ❌ 讓 LLM 產生**未經 DB 驗證**的條號或引用。
- ❌ 把合法性檢核輸出成「合法/不合法」的**確定判定**而不附條文、疑慮、信心度、免責。
- ❌ 竄改、簡化、臆測法條原文。
- ❌ 硬編色碼/字級，或套用 USWDS/其它套件的內建外觀。
- ❌ 把付費 LLM 設成功能必要相依（必須可關、可走免費層）。
- ❌ 安裝禁止清單精神以外的重型相依（重型 auth 框架、UI 套件庫）未經確認。
- ❌ 未確認架構就擴充範圍（多語系、金流、跨屆 diff 等留待後續）。

## 參考文件優先順序
1. `ARCHITECTURE.md` — 資料模型、三功能架構、實作順序（Phase 0→3）。
2. `DESIGN-SYSTEM.md` — 設計 tokens 與元件（設計方向鎖定後）。
3. `法規MD轉檔/法規結構化-第20屆.json` — 種子資料（38 部/772 條，已解析）。
4. `prototype/DESIGN-NOTES.md`、`prototype/law-codex-v*.html` — 設計方向與原型。
5. `PROMPTS.md` — 分階段實作腳本（作者會逐段貼給你）。

## 成功標準
- 查詢：中文分詞正確、條文與參照可互跳、修正沿革可展開，公開可用且快。
- 檢核（免費層）：能撈出相關條文＋命中理由＋規則旗標，全部可點回原文；零 token 可獨立運作。
- 時程：從一個「錨定日」（如 10 月常會）自動推出所有法定期限，每條標明法源，並可發提醒。
- 無障礙達 WCAG AA；整體設計不 generic、符合 DESIGN-SYSTEM。
