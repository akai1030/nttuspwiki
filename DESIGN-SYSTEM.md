# DESIGN-SYSTEM.md · 國立臺東大學學生會 · 法規系統

> 設計語言（v1.0，2026-07-03 鎖定）。tokens 全數取自已核可原型：`prototype/law-codex-v4.html`（首頁）與 `prototype/law-codex-v4-reader.html`（條文閱讀器）。
> 實作時落地為 `styles/tokens.css` + Tailwind 設定；顏色/字級/間距**只從 tokens 取**，不硬編。代號「書院光」。

## 0. 設計原則（口號）
1. **書院光**：暖白紙底、靛藍一色、明體撐骨——莊重但不官僚、不無聊。
2. **明體讀法、黑體操作**：法條正文用襯線（Noto Serif TC）好讀；UI 與小字用黑體/等寬。
3. **一色到底**：靛藍是唯一強調色；五類法規各有識別色，只用在分類標籤。
4. **小字有規矩**：數字對齊、標籤加字距、中文小字不用等寬、對比達標。
5. **不漂移**：只用本檔 tokens；不套 USWDS 外觀、不長成 generic AI 樣板。

## 1. 色彩 tokens
```css
:root{
  /* 基底 */
  --ink:#17181C;        /* 主文字、深色標籤 */
  --paper:#FBFAF6;      /* 頁面暖白底 */
  --paper2:#F1EFE7;     /* 次級面（閱讀區、hover） */
  --cloud:#E8E9E4;      /* 更淡分隔面 */
  /* 強調（唯一主色：靛藍 cobalt） */
  --accent:#243FB5;     /* 連結、當前態、主按鈕、參照 */
  --accent-soft:#3B54C8;/* hover */
  --accent2:#C7442E;    /* 磚紅：警示/沿革標記，少量 */
  /* 文字階層 */
  --muted:#807F78;      /* 次要（較大字可用） */
  --meta:#5C5B54;       /* 小字專用（對比 ≥4.5:1，勿用更淺） */
  /* 線 */
  --line:rgba(23,24,28,.14);
  --line-soft:rgba(23,24,28,.07);
  /* 五類分類識別色（只用於分類標籤/圓點） */
  --cat-charter:#243FB5;  /* 最高章程 */
  --cat-legis:#17181C;    /* 立法 */
  --cat-exec:#C7442E;     /* 行政 */
  --cat-judic:#5B3E9B;    /* 司法（紫） */
  --cat-elect:#1F7A54;    /* 選舉（松綠） */
  /* 語意（檢核/時程邊註） */
  --ok:#0F6E56; --warn:#993C1D; --sch:#0F6E56; --ref:#243FB5;
}
```
- **暗色**只用於首頁 hero 之外的特殊區塊時，文字改用 `--paper`；一般頁面一律亮底。（本系統以亮色為主，不做全站深色。）
- 對比：小字（≤13px）一律 `--meta` 以上；`--muted` 僅供 ≥16px 或非關鍵資訊。

## 2. 字體系統
| 角色 | 字體 | 用於 |
|---|---|---|
| 襯線 `--serif` | **Noto Serif TC** | 大標、法規名、條名、**條文正文**（閱讀主體） |
| 黑體 `--sans` | **Noto Sans TC** | 中文 UI、內文、**所有中文小字/meta** |
| 拉丁/數字 `--ui` | **Space Grotesk** | 大數字、英文標籤、eyebrow、統計 |
| 等寬 `--mono` | **Geist Mono** | 條號 §、日期、代碼、側欄軌、tabular 對齊 |

字級階層（clamp = 響應式）：
| Token | 值 | 字體/字重 |
|---|---|---|
| hero-org | clamp(30,5.4vw,76)px | serif 700 |
| hero-sys | clamp(56,10.5vw,154)px | serif 900 |
| hero-en（外框） | clamp(20,3.2vw,46)px | ui 700, `-webkit-text-stroke` |
| h2 區塊標 | clamp(28,4vw,44)px | serif 700 |
| 法規名（閱讀 h1） | 40px | serif 900 |
| 條名 | 18–19px | serif 600 |
| 條文正文 | 17px / line-height 2.05 | serif 400 |
| 內文/導言 | 16px / 1.9 | sans 400 |
| 小字 meta | 12.5px | sans 400, `--meta`, tnum |
| 標籤 eyebrow | 11–12px | ui 500, uppercase, tracking .12–.2em |
| 條號/日期 | 12.5–13px | mono 500, tnum |
| 大數字 | 32px | ui 700, tnum |

### 小字微排版規則（務必遵守）
1. **尺寸下限**：中文小字 ≥ 12.5px；拉丁標籤 ≥ 11px（必加字距）；正文 16–17px。
2. **數字對齊**：日期/條號/統計一律 `font-feature-settings:"tnum" 1,"zero" 1`（表格數字、slashed zero）。
3. **字距**：大寫拉丁標籤 letter-spacing .08–.2em；中文小字 0–.01em（**中文不加大字距、不用大寫**）。
4. **字重**：小字最低 400、重點 500；**禁止 300 細體用於小字**。
5. **對比**：小字色 ≥ `--meta`（4.5:1）。
6. **等寬只給拉丁/數字**：條號、日期、代碼；**中文小字一律 Noto Sans TC，不可用 mono**。

## 3. 間距（8pt 系統）
- 區塊上下 padding：桌機 118px（`section`），手機 60px。
- 容器 `.wrap` max 1180px（閱讀頁 max 1320px），左右 padding 44px（手機 22px）。
- 卡片 padding 28–30px；閱讀框 60×68px；元件內 gap 用 8/12/16/22px。

## 4. 核心元件規格
- **頂列 top**：sticky、`--paper` 88% + blur、下 1px `--line-soft`；品牌用 serif 600（`國立臺東大學學生會 · 法規系統`，「·」用 `--accent`）；nav 14px sans；CTA「幹部登入」外框按鈕。
- **側邊軌 rail**：fixed 左、直排 mono 小字（`00 序/01 總覽/02 閱讀/03 工具`），當前/hover 轉 `--accent`。
- **首頁 hero**：亮底、大「法」浮水印（serif 900，opacity .045）；標題兩行放大（org + sys）+ 英文外框字；導言 + 統計數字（Space Grotesk）；左下 scroll 提示。
- **區塊標頭 sh**：`01` mono accent ＋ serif h2 ＋ 拉長 1px 線 ＋ 右側 EN eyebrow。
- **分類標籤 catrow .label**：實色底白字（依 `--cat-*`）＋ EN 小標 ＋ 右側「N 部」。
- **法規列 row**：`編號(mono) │ 法規名(serif) + meta(sans小字) │ 閱讀→`；hover 右移 6px + `--paper2`、編號轉 accent。
- **閱讀器（註疏本式）**：
  - 左 **章條目錄 toc**（sticky）：章標 + 條連結，當前條 `--accent` 反白。
  - 中 **條文**：`§號(mono) │ 條名+正文`；款項用 `.items`（`一/二` mono 懸掛縮排 26px）。
  - 右 **邊註 notes**：`參照(可 hover 預覽卡)/沿革/時程` 三型，左細邊色分別 `--ref/--accent2/--sch`。
  - **版本 chips**（第20/19/18屆，當前 accent 實色）＋ **沿革** `<details>` 收合。
  - 每條 hover 顯示「複製引用/永久連結」。
  - 手機：目錄收起，邊註降到條文下方橫排。
- **檢核卡**：判定 pill（有疑慮＝磚紅系）＋ 信心度 ＋ 逐條引用（左 accent 邊、條號 sans 小字、引文 serif），底部免責小字。
- **時程卡**：錨定事件列 ＋ 由 mono 日期起的法定期限列，每列標法源條號。
- **chip/badge**：mono 或 sans 小字、細框；當前態 accent 實色白字。
- **按鈕**：主＝ink/accent 實色白字；次＝外框；避免用到停用態。

## 5. 手機版
- 斷點 860px（首頁）/1000px（閱讀器）。
- 首頁 hero 標題自動縮（clamp）；rail 與 top nav 隱藏。
- 閱讀器目錄隱藏；邊註 `notes` 移到條文下方，橫向 flex 換行。

## 6. 微文案清單（集中於 `lib/copy.ts`）
- 站名：`國立臺東大學學生會 · 法規系統`
- 導覽：`法規總覽`、`條文閱讀`、`檢核・時程`、`幹部登入`
- 首頁導言：`三十八部自治法規，整理成一部查得到、讀得懂、對照得起來的數位法典。`
- 統計：`部法規`、`條條文`、`現行版本`、`第20屆`
- 列表動作：`閱讀 →`；捲動提示：`SCROLL ↓ 向下捲動`
- 分類：`最高章程 / 立法 / 行政 / 司法 / 選舉`（EN：Charter/Legislative/Executive/Judicial/Election）
- 閱讀器：`共 N 條`、`第20屆 現行`、`最近修正 民國 …`、`修正沿革（N 次）`、`複製引用`、`永久連結`
- 邊註標：`參照`、`沿革`、`時程・週期/相對/絕對`
- 檢核判定：`符合 / 有疑慮 / 不符合 / 資料不足`；`信心 高/中/低`
- 免責（固定句）：`本結果僅供參考，正式效力以議會／評議會認定為準，請人工覆核。`

## 7. 禁止事項（防漂移）
- ❌ 硬編色碼/字級（一律走 tokens）。
- ❌ 中文小字用等寬（Geist Mono）；等寬只給拉丁/數字。
- ❌ 小字用 300 細體，或用比 `--meta` 更淺的色。
- ❌ 數字/日期不開 tabular。
- ❌ 主色多於一種（靛藍唯一；`--cat-*` 只給分類標籤，`--accent2` 只給警示/沿革）。
- ❌ 漸層、重陰影、發光。
- ❌ 套 USWDS/UI 套件的內建外觀，或做成 generic AI 版型。
- ❌ 破壞 WCAG AA（對比、焦點態、鍵盤可達）。
