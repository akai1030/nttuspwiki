# DESIGN.md · 法典的設計規範

改畫面之前讀這頁。規範寫成程式：值在 `design/tokens.json`，改檔當下 hook 會檢查，CI 跑 `npm run design:check`。
設計語言（書院光）、元件長相、微文案在 `DESIGN-SYSTEM.md`；兩份對不上時以 `design/tokens.json` 為準，因為檢查程式只認它。

## Tokens

值有兩份：`design/tokens.json`（規範，Tailwind 與檢查程式讀它）和 `styles/tokens.css`（瀏覽器讀的 CSS 變數）。改值兩份一起改，`npm run test:design` 會比對兩邊一字不差。

**字級（7 級）**

| class | 大小 | 行高 | 字體 | 用在 |
|---|---|---|---|---|
| `text-h2` | 手機 28 → 桌機 44px | 1.1 | 明體 700 | 每頁的 H1（一頁一個）、首頁區塊大標 |
| `text-h4` | 21px | 1.3 | 明體 600 | 卡片標題、小節標題 |
| `text-art-name` | 19px | 1.5 | 明體 600 | 條名、列表裡的項目名稱 |
| `text-art-body` | 17px | 2.05 | 明體 | 條文正文 |
| `text-body` | 16px | 1.75 | 黑體 | 內文、表單 |
| `text-caption` | 12.5px | 1.6 | 黑體 | 小字：日期、說明、標籤。中文小字的下限 |
| `text-chip` | 11px | 1 | Space Grotesk | 徽章、拉丁字母標籤。不放中文 |

同一級的變體（大小一樣，行高或字重不同）：`text-lede`、`text-brand`（16px）、`text-note`、`text-note-label`（12.5px）、`text-cat-en`（11px）。

已停用、還會產生的 12 個：`hero-org`、`hero-sys`、`hero-en`、`law-title`、`bignum`、`row-num`、`row-name`、`cat-label`、`chap`、`nav`、`code`、`eyebrow`。現有 46 處記在基準裡，只准變少；每個建議換成哪一級寫在 `design/tokens.json` 的 `deprecated`。

class 名稱沿用原本的（每頁的 H1 叫 `text-h2`），改名要動每一頁，之後另外做。

**字重**：`font-normal`／`medium`／`semibold`／`bold`／`black`。不用細體（100–300）與 800。

**顏色**：色名照用途分組，class 不帶組名。

| 組 | 色名 |
|---|---|
| 文字 | `ink`、`body-ink`（條文）、`lede-ink`（導言）、`meta`（小字，最淺只到這）、`muted`（只給 ≥24px 或非文字）、`ref-ink`、`warn-ink`、`white`（實色底上的字） |
| 底色 | `paper`、`paper2`、`cloud`、`ref-surface`、`toc-on`、`warn-surface`、`paper-blur` |
| 主色 | `accent`（唯一主色）、`accent-soft`（hover）、`accent2`（警示、沿革，少量） |
| 線 | `line`（border 預設）、`line-soft`、`ref-border`、`warn-border`、`sch-line` |
| 分類 | `cat-charter`、`cat-legis`、`cat-exec`、`cat-judic`、`cat-elect`，只用在分類標籤與圓點 |
| 語意 | `ok`、`warn`、`sch`、`ref` |

**間距**：Tailwind 內建級距（4px 一格），加上版面用的 `section`（118px）、`section-sm`（60px）、`wrap`（44px）、`wrap-sm`（22px）、`card`（30px）。

**寬度（3 種）**：`max-w-wrap`（1180px，一般頁面）、`max-w-wrap-reader`（1320px，條文閱讀頁）、`max-w-reader`（730px，單欄閱讀、長文）。

**圓角**：`rounded-sm`（3px）、`rounded-full`（圓點）、`rounded-none`。**陰影、漸層**：不用。

## 用法規則

1. **字級只用上面 7 級與變體。** 不寫 `text-[13px]`、`text-sm` 這類 Tailwind 預設、`style={{ fontSize }}`。行高、字距跟著字級走，不寫 `leading-[…]`、`tracking-[…]`。
2. **顏色只用色名。** 不寫 `#243fb5`、`bg-[#…]`、`text-gray-500`、`style={{ color }}`。
3. **頁面容器一律 `mx-auto` 配上面 3 種寬度之一。** 元件內的寬度用 Tailwind 的級距（`w-64`、`max-w-sm`），不寫 `w-[…]`。
4. **間距、高度、層級、透明度用 Tailwind 的級距**（`p-4`、`h-10`、`z-10`、`opacity-70`），不寫 `p-[19px]`、`h-[42px]`。`grid-cols-[…]` 這類版面結構可以寫任意值。
5. **小字對比**：12.5px 以下的字用 `text-meta` 以上，不用 `text-muted`。中文小字用黑體，不用等寬。（這條程式還不會檢查）

不檢查的地方：列印視窗（`components/PrintButton.tsx`）與開會通知信件（`lib/meetings/notice.ts`）是另開的文件、不吃 Tailwind，只能寫 CSS 字串，所以不數字級、陰影、style 物件；列印視窗的顏色照數。開會通知信件的顏色是照真本做的（檔頭說明、CLAUDE.md 第 1 條），連顏色都不數。

## 怎麼跑檢查

| 指令 | 做什麼 |
|---|---|
| `npm run design:check` | 掃 `app`、`components`、`lib` 的 ts／tsx 與 `styles` 的 css，逐檔跟 `design/baseline.json` 比。任何檔的任何一條比基準多就不通過（CI 跑這個） |
| `npm run design:check -- --list --rule font-size` | 列出違規位置（不加 `--rule` 就全列） |
| `npm run design:check -- --update` | 違規變少之後把基準往下釘。有任何一處變多就拒絕寫入 |
| `node scripts/design-check.mjs --changed <檔...>` | 只查這幾個檔 |
| `npm run test:design` | 檢查程式自己的測試，也比對 tokens.json、tokens.css、tailwind.config.ts 三邊一致 |

- **hook**：`.claude/settings.json` 的 PostToolUse。Claude 用 Edit／Write／MultiEdit 改到上面範圍的檔時跑 `design-check.mjs --hook`，比基準多就把新加的那幾行回給 Claude 修。改的是 `design/tokens.json` 或 `styles/tokens.css` 時全掃一次。
- **基準只准變少**：修掉違規後 `design:check` 會要你跑 `--update`，連同 `design/baseline.json` 一起提交。不跑的話省下來的額度之後會被別的改動用掉，所以 CI 也會擋。
- 搬檔、改名時，新檔每條都不超過舊檔就自動當成同一個檔；拆成兩個檔的，手動把 `baseline.json` 的鍵改過去，PR 說明寫一句。

## 要加新值時

1. 先確認現有 token 真的不夠用。字級 7 級、寬度 3 種是刻意收的，「差 1px 比較好看」不算理由。
2. 改 `design/tokens.json`，同一個值在 `styles/tokens.css` 加變數，Tailwind 自動吃到；這頁的表同步改。跑 `npm run test:design` 確認兩邊一致。
3. PR 說明寫為什麼要加、哪些畫面會用，等昀楷確認再合。
4. 不要用 `text-[…]` 先頂著，也不要調高 `design/baseline.json` 讓檢查過關。
