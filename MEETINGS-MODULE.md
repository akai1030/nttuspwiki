# 會議營運模組 — 設計文件（Phase 4 擴充）

> v0.1 草案 · 2026-07-15 · 待 Kai 拍板後才進實作
> 本文只做架構規劃，不含實作程式碼。定位：把幹部後台的「會議營運」四項需求，長在既有資料層與 `DESIGN-SYSTEM.md` 之上。
> 前置已完成：**幹部登入閘門**（`/login` + `/console` + middleware，見 `lib/auth/`）已上線並端到端驗證通過，本模組所有頁面都掛在 `(dashboard)` 之下。

---

## 0. 這份文件解決什麼

Kai 在 Phase 4 追加四項幹部實際功能：

1. **議程表製作自動化**
2. **會議事前時間的提醒**
3. **會議資料的統整整理**
4. **郵件自動化**（產生開會通知/議程信＋勾選收件人）

**關鍵發現**：這四項不是四個獨立系統，而是**同一條會議工作流**的不同切面，共用一份「會議」資料。因此整併成後台一個 **會議營運（Meetings）** 模組。

**與 ARCHITECTURE.md 的關係**：本模組把架構 §2C 抽象的「法規推導時程」落地為**綁定真實會議**的具體流程。§2C 的 `ScheduleRule`（從法條抽法定期限）保留給未來；本模組的提醒錨定在**具體會議日期**，更單純、零紅線、幹部即時可用。

### 決策已定（2026-07-15）
- **切入方式**：先出本設計文件 → Kai 確認 → 再一次做對（不邊做邊返工）。
- **郵件安全界線**：**只生草稿、人工按送出**。系統**永不呼叫寄信送出 API**，只產生內容/草稿，最後由真人在官方信箱確認送出（守住 CLAUDE.md「對外發送 Email＝紅線」）。

---

## 1. 公版來源（已從 Kai 的 Gmail 撈到真本）

寄件者 `nttusp@gm.nttu.edu.tw`（學生議會祕書處），兩種正式格式，帶「東議字第XXXX號」公文字號。**這是套版的事實依據，不自行杜撰。**

### 1A. 開會通知單（主旨 `【開會通知】檢送…「{學年度學期}{會議名}」開會通知單`）
```
國立臺東大學第{屆}議會{會議名} 議員代表 您好：

本次{會議名}將於{民國日期（星期）時間}，至{地點／線上視訊會議室}召開，
會議通知已於{MM/DD（週）}函送至出席與列席人員單位（東議字第{文號}號）。
**註：會議須達二分之一以上代表出席方得開議，敬請代表撥冗與會。

〔會議重要資訊〕
議會常會｜{會議全名}
會議時間：{民國日期（星期）時間}
會議連結：{Google Meet URL}
備註：
一、本次會議提案截止繳交時間為{截止日}23時59分前。
二、{其他備註…}

敬祝 平安順心
國立臺東大學第{屆}學生議會 祕書處 祕書長 {祕書長姓名}敬上
────────────────────
{祕書長姓名}／M：{手機}／e-mail：{祕書處信箱}
```

### 1B. 會議通知（議程）（主旨 `【會議通知】檢送…議程`）
同 1A，正文多一句：
```
檢附本次會議議程（附件1）、提案與相關資料（附件2-{N}）之電子檔，敬請審閱。
```

### 1C. 附件命名慣例
`{YYYYMMDD}_國立臺東大學學生議會_{學年度學期會議名}_出席開會通知單.pdf`

### 變數槽位（＝會議資料要存的欄位）
屆別／會議名／學年度學期／會議日期時間／地點 or Meet 連結／東議字號／提案截止日／附件數／祕書長署名區。
→ 這些槽位由 §2 的 `Meeting` 提供；`議程製作`（附件1）與 `郵件自動化` 共用同一份。

---

## 2. 資料模型（新增；沿用 Prisma + 既有 `User`）

```prisma
enum MeetingKind {
  REGULAR    // 常會
  SPECIAL    // 臨時會
  COMMITTEE  // 委員會 / 校級會議代表委員會
}

enum MeetingStatus {
  DRAFT      // 建置中（尚未發通知）
  NOTICED    // 已發開會通知
  HELD       // 已召開
  CLOSED     // 已結案（決議/紀錄歸檔）
}

model Meeting {
  id               String        @id @default(cuid())
  session          Int           // 屆別，如 21
  academicYear     String        // 「114學年度第2學期」
  name             String        // 「七月議會臨時會」
  kind             MeetingKind
  meetingAt        DateTime      // 會議時間
  location         String?       // 「線上視訊會議室」
  meetingUrl       String?       // Google Meet 連結
  docNumber        String?       // 東議字第1140246號
  proposalDeadline DateTime?     // 提案截止
  notes            String?       @db.Text // 備註一、二…
  status           MeetingStatus @default(DRAFT)
  createdById      String        // User.id（幹部）
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  proposals   Proposal[]
  agendaItems AgendaItem[]
  notices     MeetingNotice[]
  reminders   MeetingReminder[]

  @@index([session, meetingAt])
}

model Proposal {          // 提案（＝附件 2-N）
  id          String   @id @default(cuid())
  meetingId   String
  meeting     Meeting  @relation(fields: [meetingId], references: [id])
  serialNo    Int      // 附件序 / 案號（2、3…）
  section     String   // 報告事項 / 討論事項 / 選舉事項 / 臨時動議（決定議程分節）
  title       String   // 案由
  proposer    String?  // 提案人 / 提案單位
  explanation String?  @db.Text // 說明
  resolution  String?  @db.Text // 決議（會後補）
  fileUrl     String?  // R2 附件
  order       Int      @default(0)

  @@index([meetingId])
}

model AgendaItem {        // 議程項（含非提案項：主席報告、確認前次紀錄、散會…）
  id         String   @id @default(cuid())
  meetingId  String
  meeting    Meeting  @relation(fields: [meetingId], references: [id])
  section    String   // 分節（同 Proposal.section 或固定節）
  order      Int
  title      String
  body       String?  @db.Text
  proposalId String?  // 對應提案時連結，可回溯

  @@index([meetingId])
}

model Recipient {         // 收件人名單（個資：officer-only，永不進公開路由）
  id        String   @id @default(cuid())
  session   Int
  name      String
  email     String
  roleTag   String   // 議員 / 列席 / 旁聽 / 祕書處
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  @@index([session, active])
}

model MeetingNotice {     // 生成的開會通知/會議通知（草稿；永不由系統送出）
  id           String   @id @default(cuid())
  meetingId    String
  meeting      Meeting  @relation(fields: [meetingId], references: [id])
  kind         String   // notice（開會通知）/ agenda（會議通知含議程）
  subject      String   // 套版生成主旨
  bodyText     String   @db.Text // 套版生成內文
  recipientIds Json     // 勾選收件人快照（Recipient.id[]）
  gmailDraftId String?  // 若建成 Gmail 草稿則記錄；仍需人工送出
  status       String   @default("draft") // draft / sent（sent 僅代表人工已送，系統不觸發）
  createdById  String
  createdAt    DateTime @default(now())

  @@index([meetingId])
}

model MeetingReminder {   // 會前提醒（錨定 Meeting.meetingAt）
  id        String   @id @default(cuid())
  meetingId String
  meeting   Meeting  @relation(fields: [meetingId], references: [id])
  offsetDays Int     // 會前幾天（3、1…）
  fireAt    DateTime // 由 meetingAt - offset 算出
  channel   String   // inapp（先做）/ email_draft（生草稿，人工送）
  sentAt    DateTime?

  @@index([fireAt])
}
```

> 註：`Recipient` 與登入用的 `User` 是兩張表——`User` 是「能登入後台的幹部」，`Recipient` 是「會收到開會通知的議員/列席名單」，兩者對象不同。

---

## 3. 四項功能怎麼落地

| Kai 的需求 | 落地 | 依賴 | 紅線 |
|---|---|---|---|
| 1 議程表自動化 | Proposal 依 section 分節排序 → 生成議程（附件1 版式）→ 匯出 | Meeting/Proposal/AgendaItem | 否 |
| 2 會前提醒 | MeetingReminder 由 meetingAt 往前推 → 站內看板 + 到期提醒 | Meeting + 提醒 worker | 否 |
| 3 會議資料統整 | Proposal 附件集中、依序命名、一鍵打包（附件2-N） | R2 上傳 | 否（檔案存取需權限） |
| 4 郵件自動化 | 套 §1 公版 + 勾選 Recipient → **生成草稿** | Meeting/Recipient/公版 | ⚠️ 對外發送 |

### 3.4 郵件自動化的安全流程（draft-only，已定案）
```
建/選會議 → 系統套 §1 公版填欄位 → 勾選收件人（Recipient 清單，checkbox）
        → 產出【主旨＋內文＋收件人清單】
        → 兩種出口（擇一或並存）：
           (a) 站內預覽 + 一鍵複製（主旨/內文/收件人）→ 人到官方信箱貼上寄
           (b) 建成 Gmail 草稿（用 Gmail 連接器 create_draft）→ 人在信箱按送出
系統全程不呼叫「送出」；沒有 cron 自動外寄。
```
- **MVP 建議走 (a)**：因為連接器目前綁的是個人信箱，官方寄件是 `nttusp@`；站內生成＋複製最務實、零帳號綁定風險。
- **(b) 為增強**：待官方 `nttusp@` 信箱接上連接器後，可直接落草稿到官方 Drafts。
- 防呆：收件人為明確勾選並快照；`MeetingNotice.status` 的 `sent` 僅供人工回記，系統不觸發送出。

---

## 4. 建置順序（本模組內部）

- **4A 資料層 + 會議 CRUD**：Meeting 建立/編輯（填 §1 公版欄位）、`/console/meetings`。
- **4B 提案 + 議程生成**：Proposal 收集 → 依 section 生成議程（附件1 版式）可預覽/匯出。
- **4C 郵件自動化（draft-only）**：Recipient 名單管理 + 套版生成開會通知/議程信 + 勾選收件人 → 站內預覽/複製（Gmail 草稿為增強）。
- **4D 會前提醒**：MeetingReminder + 站內看板 + 到期提醒 worker（email 提醒亦只生草稿）。
- **4E 會議資料統整**：Proposal 附件 R2 上傳、集中、依序打包。

每階段做完 stop 讓 Kai review（沿用 PROMPTS.md 慣例）。

---

## 5. 待 Kai 拍板的開放問題

1. **收件人名單來源**：議員/列席名單目前哪來？手動輸入、或有現成表可匯入 `Recipient`？
2. **官方寄件帳號**：`nttusp@gm.nttu.edu.tw` 要不要接上系統做 Gmail 草稿（出口 b）？還是先只做站內生成＋人工貼上（出口 a）？
3. **議程分節**：正式議程（附件1）的分節有哪些（報告事項／討論事項／選舉事項／臨時動議／…）？—— 建議 Kai 給一份真實議程 PDF（或授權我從 Gmail 附件撈一份），照它的實際結構定 `section` 列舉，才不會臆測。
4. **東議字號**：文號流水規則（`1140246`＝？年度＋流水）？要系統自動編還是人工填？
5. **屆別轉換**：資料要否跨屆（20→21 屆已在信中出現）？`Meeting.session` 已預留。
6. **會議紀錄**：要不要一併做「會後決議/會議紀錄」歸檔（Proposal.resolution 已預留欄位）？

---

## 附錄：檔案結構規劃（沿用專案慣例）
```
app/(dashboard)/console/meetings/…   # 會議列表 / 建立 / 單一會議
lib/meetings/…                       # 套版（notice-template.ts）、議程生成、提醒推算
lib/copy.ts                          # 微文案（勿散落字串）
data/…                               # Recipient 匯入腳本（若走匯入）
prisma/schema.prisma                 # §2 模型
```
微文案集中、顏色字級只從 `styles/tokens.css`、渲染前轉義擋 XSS（PDF/貼上文字當不可信）——延續 CLAUDE.md 編碼規則。
