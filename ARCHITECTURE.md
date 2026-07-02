# 國立臺東大學學生會法規整合網站 — 架構草案（Step 2 + Step 3）

> v0.1 草案 · 2026-07-02 · 待 Kai 拍板後才進實作
> 本文只做架構規劃，不含實作程式碼。技術棧沿用網站建立流：**Next.js 14 App Router + TypeScript + Tailwind + Zeabur PostgreSQL + Cloudflare R2**。

---

## 0. 已對齊的定位決策

| 面向 | 決定 |
|---|---|
| 使用者與權限 | **公開唯讀 + 幹部後台**：法規查詢全校公開檢閱；合法性檢核、時程提醒需幹部登入 |
| 版本範圍 | **現行版（第 20 屆）為主**，資料表保留 `session`／`version` 欄位；快照 diff 第一天可用，對照表標註後補 |
| 檢核輸入 | 三種都要：**議會提案／法規修正案**、**活動企劃書與經費申請**、**任意貼上文字** |
| 提醒管道 | **站內看板 + Google Calendar 訂閱 + Email + LINE 群組** |

### 語料事實（Step 1 已完成，作為架構依據）

- 第 20 屆現行法 **38 份 / 733 條 / 約 8.8 萬字**，全部可抽字，已轉成結構化 JSON。
- **交互參照密集**：43 筆明文「《法規》第 X 條」跨法引用，其中 26 筆指向《組織章程》（全套法規的母法），多數可在語料內解析；另有 10 條含「準用」。
- **時程條款分三型**：相對期限（事件錨定，如開會前 3 日、缺位後 1 個月、收件後 14 工作日；共 40+ 筆）、週期型（每月常會／每學期，41 筆）、絕對型（會期 7/1–6/30，9 筆）。
- **關鍵推論**：語料極小 → 全套現行法可一次塞進單一 LLM context（~9 萬字 ≈ 可全放）。這會大幅簡化檢核的 RAG 設計，也讓全文檢索不需要重型基礎設施。

---

## 1. 共用地基：統一資料模型

三個功能不是三個獨立系統，而是**長在同一份結構化法規上**。先把共用 schema 定清楚，後面三節各自取用。

```prisma
// ── 法規結構（查詢／檢核／時程 共用）──
model Law {
  id           String   @id @default(cuid())
  category     String   // 最高章程 / 行政 / 立法 / 司法 / 選舉
  number       String   // "0.0" "1.10"
  name         String
  session      Int      // 屆別，現行=20
  isCurrent    Boolean  @default(true)
  currentDate  DateTime?
  currentType  String?  // 修正 / 訂定
  preamble     String?  @db.Text
  sourceFile   String?  // 原始 PDF 路徑，供人工覆核
  articles     Article[]
  amendments   AmendmentHistory[]
  scheduleRules ScheduleRule[]
  @@unique([session, number])
  @@index([category])
}

model Article {
  id        String  @id @default(cuid())
  lawId     String
  law       Law     @relation(fields: [lawId], references: [id])
  number    String  // "16" "3-1"
  name      String? // 條名
  chapter   String? // 第一章
  body      String  @db.Text  // 純文字全文（款項合併，供搜尋/顯示）
  items     Json    // 結構化款項陣列
  version   Int     @default(20)  // = session，供跨屆 diff
  tsv       Unsupported("tsvector")?      // 應用端斷詞後寫入（見 2A）
  embedding Unsupported("vector(1536)")?  // 語意檢索（見 2A/2B，可選）
  @@unique([lawId, number])
  @@index([lawId])
}

model AmendmentHistory {   // 每份法規的修正沿革（已解析）
  id          String   @id @default(cuid())
  lawId       String
  law         Law      @relation(fields: [lawId], references: [id])
  date        DateTime
  roc         String   // "113.09.19"
  sessionTerm String?  // 屆別
  action      String   // 修正 / 訂定 / 新增
  text        String   @db.Text
}

model LawReference {  // 交互參照圖：條文 → 被引用的法規/條
  id            String  @id @default(cuid())
  fromLawId     String
  fromArticleNo String?
  toLawName     String  // 被引用法規名（可能語料外，如《大學法》）
  toLawId       String? // 可解析到語料內時才有
  toArticleNo   String?
  kind          String  // cite / 準用 / 牴觸 / 另訂
  raw           String  // 原文片段
  @@index([fromLawId])
  @@index([toLawId])
}
```

`Law / Article / AmendmentHistory` 我今天已經從 PDF 解析好、存成 JSON 了，灌進 DB 幾乎是直接映射。`LawReference` 用同一批文字跑一次抽取即可建圖。

---

## 2A. 法規查詢

### 使用者故事
公開訪客：找某條、讀某法、點參照跳到被引用的條文、看某條的修正沿革。

### 資料表
就是上面的 `Law / Article / AmendmentHistory / LawReference`。條文層級的錨點（`/law/2.3#art-17`）讓引用可以互相跳轉。

### 中文全文搜尋策略（本功能的關鍵取捨）

**核心難點**：PostgreSQL 內建 `to_tsvector` 不會斷中文詞——中文沒有空白，內建 parser 會把整句當一個 token，全文檢索等於失效。這是所有中文 PG 專案的共同坑。四個方案：

| 方案 | 作法 | 優 | 缺 |
|---|---|---|---|
| ① server 擴充 `pg_jieba`/`zhparser` | 資料庫層裝中文分詞 C 擴充 | 分詞準、查詢端無腦 | **需資料庫安裝 C 擴充；Zeabur 託管 PG 不一定給裝 → 可攜性差** |
| ② 應用端分詞 + `tsvector` | 用 `nodejieba` 斷詞後寫入 `tsvector('simple')` + GIN 索引 | **免資料庫擴充、任何 PG 都能跑、可攜、便宜** | 查詢時也要同一套分詞 |
| ③ `pgvector` 語意檢索 | 每條算 embedding，向量相似度 | 抓「意思相近但用詞不同」 | 需 embedding；純關鍵字反而不如 tsvector 直觀 |
| ④ `pg_trgm` 三元組 | 模糊/部分字串 | 錯字容忍 | 中文語意差，只能當 fallback |

**建議：② 為主力 + ③ 為輔助。**

- **主力 = `nodejieba` 分詞 + `tsvector`/GIN**：處理「精準關鍵字查詢」（公開頁主要用途）。不依賴任何資料庫擴充 → 不賭 Zeabur 給不給裝 pg_jieba，可攜性最高。
- **語意層 = `pgvector`**：處理「找語意相近的條文」（也是 2B 檢核的檢索基礎）。pgvector 廣泛可用，Zeabur 用 pgvector 的 image 即可（**待確認你的 PG image**；若不行，語意層可暫時外掛，關鍵字查詢不受影響）。
- 因為語料只有 **733 條**，兩個索引都是小事，**兩個都建**，查詢時做關鍵字 + 語意的混合排序。
- 備註：語料小到甚至能整包載進記憶體做前端即時搜尋；但 DB 方案較正規、且能與檢核共用，選 DB。

---

## 2B. 合法性檢核

等於「上傳文件 → 找出相關法規 → 對照判斷是否合規」。三種輸入（提案／企劃書經費／任意貼上）走同一條管線，只差「初篩要對照哪一批法規」。

### 雙層設計：免費規則層打底、付費 LLM 選用

刻意拆兩層，讓平常零成本、也不綁死一定要花錢：

- **Layer 1｜規則清單 + 檢索對照（免費、預設、永遠開）**：不呼叫任何 AI。系統盡力用關鍵字與引用把「該比對的條文」全撈出來擺在旁邊，再用一組確定性規則自動標紅，**最終判斷交給人**。透明、可解釋、零 token。
- **Layer 2｜LLM 通讀（可選、加強）**：想要「AI 幫我整份讀一遍、抓出沒想到的牽連」時才呼叫。可接免費額度（Gemini Flash）或付費（Claude），隨時可關。

### Retrieval：盡力撈出相關條文（兩層共用）

輸入進來後，用四種訊號把 733 條收斂成「該對照的十幾條」，並附上命中理由：

1. **明文引用偵測**：輸入若寫到「《某法》第 X 條」，直接鎖定該條（最強訊號）。
2. **關鍵字全文比對**：對輸入做中文斷詞（nodejieba），抽出關鍵詞（法規名、領域詞如 預算／連署／三讀／補助／核銷），跑 `tsvector` 全文檢索並以 `ts_rank` 排序。← 這就是你要的「盡力找到相關關鍵字的條文」，且與 2A 查詢共用同一套索引。
3. **參照擴展**：命中條文透過 `LawReference` 圖，把它引用到的條文（尤其《組織章程》母法）一起拉進來。
4. **語意檢索（可選）**：`pgvector` 補關鍵字抓不到的同義/近義條文；無 pgvector 時，前三項已足夠。

### Layer 1：規則清單 + 檢索對照（免費）

- **檢索對照報告**：把撈到的相關條文列出來，每條附命中理由（引用／關鍵字／參照）與相關度，可點回原文——等於自動幫承辦人「把要翻的法條都翻到那一頁」。
- **規則清單（rule engine）**：把法規裡確定性的門檻編成檢查規則，對輸入自動標紅。例如：
  - 文件是法律修正案 → 提醒依《職權行使法》§8 需三讀。
  - 提案由會長提出 → 檢查是否達兩名議員連署（§8）。
  - 屬經費申請 → 檢查是否附活動企劃書、是否於期限內送件（社團／系學會補助辦法）。
  - 涉及調高支出 → 提醒《議會組織及實行準則》§5「議會對預算不得提出增加支出之提議」。
- **產出**：相關條文清單 + 觸發的規則旗標，判定留給人。零 token、隨時能上線。
- **侷限（誠實說）**：規則只抓「事先編好的」條件；抓不到的靠 Layer 2 或人。規則庫可持續累積。

### Layer 2：LLM 通讀判斷（可選加強）

把 Layer 1 撈到的相關條文（小語料，甚至可整章整部塞入）交給模型整體判讀。因語料極小（現行全套 ~9 萬字），可「寬鬆塞 context」而非片段式 RAG，準確度更高。

- **結構化輸出**：四種判定（符合／有疑慮／不符合／資料不足）+ 逐條引用（可點回原文）+ 疑慮點 + 信心度。
- **信心度**非模型自喊，而由三訊號合成：檢索命中強度、是否有可引用條號、模型自評；低信心一律標「建議人工覆核」。
- **防幻覺**：強制「只能引用檢索到的條文並附條號」，前端驗證條號存在於 DB，對不上標紅。
- **模型選項與成本**（即時定價 2026-07）：

  | 選項 | 花費 | 定位 |
  |---|---|---|
  | Gemini Flash（免費層） | 每天 1,500 次免費 → 實質 $0 | 想用 AI 但不想付費的預設 |
  | Claude Haiku 4.5 | $1 / $5 每百萬 token | 付費初篩、分類 |
  | Claude Sonnet 5 | $2/$10 促銷→$3/$15 | 付費主力，品質/成本平衡 |
  | Claude Opus 4.8 | $5 / $25 | 疑難案升級 |

  付費路線的成本槓桿是 **Prompt Caching**：法規語料靜態，快取後每次只付語料 token 的 10%（9 折），單次檢核約 NT$0.5–1.5，批次再打 5 折。

### 明確界線（寫進 UI）
無論哪一層，都是**輔助審查、不是法律判定**。輸出附「僅供參考，正式效力以議會/評議會認定為準，請人工覆核」。`ComplianceCheck` 保留 `reviewedBy` 留痕。

```prisma
model ComplianceCheck {
  id         String   @id @default(cuid())
  userId     String?
  inputType  String   // proposal / activity_budget / freeform
  inputText  String   @db.Text
  fileUrl    String?  // R2
  mode       String   // rule_only（免費層）/ llm（加強層）
  model      String?  // 走 LLM 時記錄用哪個（gemini-flash / claude-sonnet-5…）
  matchedArticles Json // 檢索對照撈到的相關條文 + 命中理由
  ruleFlags  Json     // 規則清單觸發的旗標
  verdict    String?  // compliant / concerns / non_compliant / insufficient（rule_only 時可為 null）
  confidence Float?
  citations  Json     // [{lawId, articleNo, quote, relation}]
  concerns   Json
  reviewedBy String?
  createdAt  DateTime @default(now())
}
```

---

## 2C. 時程管理與提醒

### 時程規則資料模型（對應 Step 1 抽出的三型）

```prisma
enum ScheduleType { RECURRING RELATIVE ABSOLUTE }

model ScheduleRule {
  id          String   @id @default(cuid())
  lawId       String
  law         Law      @relation(fields: [lawId], references: [id])
  articleNo   String   // 來源條號，可回溯法源
  title       String   // 人類可讀：「議會常會（每月一次）」
  type        ScheduleType
  rrule       String?  // RECURRING：RRULE/cron，如每月
  anchorEvent String?  // RELATIVE：錨定事件碼，如 MEETING_OPEN / PROPOSAL_PASSED
  offsetValue Int?     // RELATIVE：3 / 14 / 30
  offsetUnit  String?  // day / workday / month / hour
  direction   String?  // before / after
  fixedMonth  Int?     // ABSOLUTE：7
  fixedDay    Int?     // ABSOLUTE：1
  audience    String?  // 議會 / 行政中心 / 財委會…
  rawClause   String   @db.Text
  verified    Boolean  @default(false)  // 人工確認過才啟用
  events      ScheduleEvent[]
}

model ScheduleEvent {   // 實例化的具體事件（掛上真實日期）
  id       String   @id @default(cuid())
  ruleId   String
  rule     ScheduleRule @relation(fields: [ruleId], references: [id])
  title    String
  dueAt    DateTime
  anchorAt DateTime?    // RELATIVE：錨定事件實際發生時間
  status   String   @default("scheduled")
  reminders Reminder[]
}

model Reminder {
  id      String   @id @default(cuid())
  eventId String
  event   ScheduleEvent @relation(fields: [eventId], references: [id])
  channel String   // inapp / email / gcal / line
  fireAt  DateTime
  sentAt  DateTime?
  target  String?  // email 位址 / LINE group id
}
```

### 三型怎麼運作
- **RECURRING（每月常會、每學期）**：`rrule` 直接展開成未來一學年的 `ScheduleEvent`。
- **RELATIVE（事件錨定，如「提案通過後 10 日內召開財委會」）**：**需要先有錨定事件發生**才能算到期日。所以後台要有一個讓幹部「登記錨定事件」的介面（例：登記「X 提案 6/10 通過」→ 系統自動生出「6/20 前召開財委會」的 event）。這是時程功能最需要人操作的一環。
- **ABSOLUTE（會期 7/1–6/30）**：固定日期，直接生。

### 抽取方式：半自動
用規則 + LLM 從條文抽出時程草稿，**人工確認（`verified`）後才啟用**。法律期限抽錯會誤導幹部，所以不做全自動。好消息：時程抽取吃的也是同一份結構化條文，跟查詢共用資料層。

### 提醒串接
- **站內看板**：`Reminder(channel=inapp)` + 一頁時程總覽。最先做。
- **Google Calendar**：優先做**唯讀 `.ics` 訂閱 feed**（幹部訂閱一次，之後自動同步，最省事）；進階再考慮 OAuth 寫入個人日曆。
- **Email**：到期前 X 天由排程 worker 寄出。
- **LINE 群組**：用 **LINE Messaging API** push 到幹部群組（bot 需先加進群組取得 group id）。註：舊的 LINE Notify 已停用，走 Messaging API。
- **排程執行**：Zeabur 上一支 cron/worker 每日掃 `Reminder.fireAt <= now && sentAt is null` → 發送 → 標記。

---

## 3. 實作順序建議

### 先挑戰你的假設
你說「法規查詢是地基」。**部分同意，但更精確地說：真正的地基是「結構化法規資料層」，不是查詢功能本身。** 而那個資料層我今天已經做掉大半（733 條的 JSON）。查詢是「第一個該做的功能」，但不是三者的前提——三者共同的前提是資料層。

### 建議順序

**Phase 0 — 資料層（真正的地基）**
把 JSON 灌進 DB、建 `Law/Article/AmendmentHistory`、跑參照抽取建 `LawReference`、建 tsvector/pgvector 索引。三個功能全部站在這上面。

**Phase 1 — 法規查詢（公開頁）**
最快見效、驗證資料層是否正確、且是唯一對全校公開的部分。先上線建立信任。

**Phase 2 — 時程管理與提醒**
放在檢核之前，理由：(a) **純規則邏輯、不需 LLM、風險與成本低**；(b) 對幹部是即時可用的實用價值；(c) 時程規則的抽取跟查詢共用結構化資料，趁熱做順手；(d) 先把站內看板 + ics 做起來，LINE/Email 當增強。

**Phase 3 — 合法性檢核（最後）**
最複雜、最貴、最依賴前面資料層穩固與參照圖完整，放最後最穩。此時查詢頁已驗證資料正確、參照圖已建好，檢核的 retrieval 直接複用。

### 一個替代路線（給你選）
如果「合法性檢核」才是你心中的 killer feature、最想先看到效果——可以 **Phase 1 查詢完直接跳 Phase 3 檢核，時程往後挪**。代價是先啃最難的。預設我仍建議 0→1→2→3，因為它每一階段都能獨立上線、風險遞增而非一次到頂。

---

## 4. 安全 / 權限 / 成本 摘要

- **權限**：公開唯讀（查詢）不需登入；檢核、時程後台需幹部登入（幹部帳號量小，可用 email 白名單 + 簡單 auth，不必上重型 IAM）。角色 `admin / officer / viewer`。
- **安全**：Prisma 參數化查詢擋 SQL injection；檢核輸入與 LLM 輸出都當不可信、渲染時轉義擋 XSS；上傳檔案存 R2、限型別大小；LLM 端做 rate limit 防成本濫用。
- **成本**：查詢與時程**零 token**；檢核預設走**免費規則層**，需 AI 時可用免費額度（Gemini Flash）或付費（Claude 快取後單次約 NT$1）。主要固定成本只有 Zeabur（PG + Next.js + cron worker）月費級距與 R2 存量。**可零 API 費起步**。

---

## 5. 待你拍板的開放問題

1. **pgvector**：要確認你 Zeabur 的 PostgreSQL image 是否支援；不支援的話語意層需另接，但不影響關鍵字查詢與其他功能。
2. **LINE 群組提醒**：需要建一個 LINE bot 並加進幹部群組拿 group id——這步要你這邊配合設定。
3. **檢核的人工覆核流程**：要不要在 UI 上做「幹部覆核並簽章」的正式流程，還是先純參考？
4. **時程錨定事件**：RELATIVE 型需要有人登記「某提案何時通過」等錨定事件，這個登記責任歸誰（議會祕書處？）？
5. **歷屆 diff**：要不要現在就把 16–19 屆也解析、生跨屆 diff？（成本低，我隨時能做。）

---

## 附錄：技術棧與檔案結構（沿用網站建立流）

- **前端/後端**：Next.js 14 App Router + TypeScript + Tailwind
- **DB**：Zeabur PostgreSQL + Prisma
- **檔案**：Cloudflare R2（上傳的待檢核文件）
- **搜尋**：nodejieba + tsvector/GIN（主）、pgvector（語意，待確認）
- **合法性檢核**：預設免費層（規則清單 + 檢索對照，零 token）；LLM 為可選加強層（免費額度 Gemini Flash 或付費 Claude + Prompt Caching）
- **排程**：Zeabur cron worker（提醒發送）
- **禁止依賴**（待實作階段補完）：先不引入重型 auth 框架、不引入非必要 UI 套件庫，維持精簡。
