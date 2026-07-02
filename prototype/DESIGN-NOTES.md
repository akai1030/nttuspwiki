# 設計研究筆記 + 兩個真實原型（v1 / v2）

> 2026-07-02 夜間自主作業。你嫌先前的內嵌小圖「偏 AI 偏醜」——對，那些是長在 Claude 自己的介面系統裡的 flat widget，天生就那個味。這次我去 muuuuu 實際看真網站取靈感，然後做成**可在瀏覽器全螢幕打開的真 HTML 原型**（真字體、全幅版面、真美術方向）。

---

## 一、我實際看了哪些真網站

- **muuuuu.org**（日系設計獎廊）→「教育サービス」分類（223 個真站）。muuuuu 本身只是入口，我看的是它底下策展的站。
- **中央大學 スポーツ情報學部**（sdb.chuo-u.ac.jp）— 大學科系官網。
- **東京都私學財團**（shigaku-tokyo.or.jp）— 教育財團／機構官網。

### 抓到的「不無聊」手法（都來自上面真站）
1. **超大顯示字／裁切字**：中央大把「SDB」放到超大、裁切到出血當背景圖形。→ 我用大「法」字當浮水印。
2. **編輯式段落編號**：「01 Movie」這種 mono 數字標段落。→ 我用 01/02/03。
3. **標題後的色塊 highlight**：中央大在日文標題後墊一塊實色。→ 我用在分類標籤。
4. **單一強調色**：中央大＝深紅；東京財團＝森綠。克制、只有一色。
5. **明體（襯線）撐權威與長文可讀**＋**黑體/grotesk 當 UI**＋**mono 標條號日期**。
6. **側邊區塊軌 / 直排標籤**、**紙張顆粒質感**、**留白大**、**hover 微互動**。
7. 東京財團示範了另一極：**暖色紙感＋手繪插畫＋圓角**＝機構也能親切不官僚。

---

## 二、綜合原則（呼應你的兩個判斷）

- **USWDS 2.0 的「規則」= 地基**：無障礙（WCAG AA）、元件化、design tokens、清楚結構、plain language。這些照用。
- **但視覺皮膚 ≠ USWDS**：USWDS 內建樣式偏醜，我們換成上面日系編輯藝廊等級的美術方向。
- 一句話：**USWDS 的骨、編輯藝廊的皮。**

---

## 三、兩個真原型（打開來看）

打開方式：在檔案上按右鍵 →「用瀏覽器開啟」，全螢幕看。字體從 Google Fonts 載入，需連網。

### v1 · 墨典（`law-codex-v1.html`）— 大膽・電影感
- 暖黑首屏 + 大「法」浮水印 + **朱紅**強調（呼應官印），明體大標題。
- 內文頁改成暖紙底、明體條文、邊註可跳參照、修正沿革做成時間軸。
- 檢核／時程卡片沿用同一套語言（暗底）。
- 個性最強、最「不無聊」，接近中央大那種 confident 電影感。

### v2 · 書院光（`law-codex-v2.html`）— 明亮・安靜自信
- 亮暖白、**靛藍（cobalt）**強調 + 一點磚紅點綴；分割式首屏，右側用大數字（38／733／43）當視覺。
- 更通透、克制、好讀，走 2026 日系「安靜的自信」路線。
- 一樣有內文閱讀頁與檢核／時程卡。

兩者共用同一套資訊架構與元件，只是**明暗與氣質不同**：v1 濃、v2 淡。

---

## 四、原型裡哪些是真、哪些是示意
- **真**：字體搭配、版面、色彩、間距、hover、區塊結構、法條閱讀的排版邏輯。
- **示意**：只放了幾部法規當樣本；正式版會接上 733 條的結構化資料（我已解析好的 JSON）。

---

## 五、下一步（等你醒來挑）
1. 選 **v1 / v2 / 兩者混血 / 都不對再調**。
2. 你也可以直接丟我 1–3 個「你覺得好看」的網址，我照著校準。
3. 選定後我把它鎖進 `DESIGN-SYSTEM.md`（色彩/字級/元件/微文案 tokens），再收尾 `CLAUDE.md`、`PROMPTS.md`，整包交棒給 Claude Code 實作。

---

## 六、參考網址清單（可點，醒來自己逛）

### 我實際看過、可背書的
- 中央大學 スポーツ情報學部 — https://sdb.chuo-u.ac.jp/ ｜暖黑、超大裁切字、深紅、段落編號、側邊軌。**v1 主要靈感。**
- 東京都私學財團 — https://www.shigaku-tokyo.or.jp/ ｜暖紙顆粒、手繪插畫、森綠、圓角、親切機構感。**「機構也能不官僚」的證據。**
- PP Neue Montreal（字型廠） — https://neuemontreal.com/ ｜暗底、動態、粗 grotesk、膠囊按鈕。**動態與字感參考。**

### muuuuu 精選、值得一看（我還沒逐一細看，你可挑）
- 日經電子版 for Education — https://www.nikkei.com/promotion/education/ ｜媒體/編輯感
- 22世紀アート（出版社） — https://22art.jp/ ｜出版/文字編排
- ShareDan — https://www.sharedan.co.jp/ ｜俐落企業
- MONOLOG — https://bymonolog.com/ ｜藝術/暗系
- Eleos — https://www.eleos.la/ 、Get Blue — https://www.getblue.com/ 、naito-otsuka — https://naito-otsuka.com/

### 自己逛更多（muuuuu 分類入口）
- 教育（223）— https://muuuuu.org/category/industry/education-service
- 設計・藝術（585，最強設計池）— https://muuuuu.org/category/industry/art
- 科學・研究機構（16）— https://muuuuu.org/category/industry/science-research

### 規則地基（骨架用，樣式別學）
- GOV.UK Design System — https://design-system.service.gov.uk/
- USWDS 2.0 — https://designsystem.digital.gov/

> 用法：挑 2–3 個你「一看就喜歡」的丟給我，我照著把 v1/v2 調到你的味，或直接鎖一版進 DESIGN-SYSTEM.md。
