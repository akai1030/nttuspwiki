# 資料保真 · 信任鏈與「逐字一致」定義

> 目標（Kai）：**網頁上顯示的條文，逐字等同官方原文（PDF/Word）。**
> 本文說明保證怎麼建立、每一段驗到什麼程度、以及目前的已知缺口。

## 信任鏈

```
官方 PDF ──①──▶ 結構化 JSON ──②──▶ Postgres(DB) ──③──▶ 網頁 HTML ──④──▶ 瀏覽器渲染的字
```

| 段 | 驗什麼 | 工具 | 狀態 |
|---|---|---|---|
| ① PDF → JSON | 每條 body 逐字來自 PDF | `source-check.ts` + **PyMuPDF**(`extract_pdf.py`，獨立引擎) | ✅ **768/768 逐字命中**（`npm run fidelity:source`，可隨時重跑） |
| ② JSON → DB | DB.body 逐字 === JSON | `data/verify.ts` §2 | ✅ 通過（38 部/768 條） |
| ③ DB → 網頁 HTML | 渲染字串 === DB | （Phase 3 加，render===DB） | ⏳ 待 Phase 3 頁面 |
| ④ HTML → 瀏覽器 | 畫面上的字 === 原文 | Playwright 抓 DOM 逐字比對 + CI 擋部署 | ⏳ 待 Phase 3 頁面 |
| 全鏈 drift 守門 | 任何一段的法條文字被改動 | `manifest.json`（每條 SHA-256，git 追蹤） | ✅ 已產生 768 條指紋 |

> **抽取器**：預設用 PyMuPDF（`extract_pdf.py`，`pip install -r data/fidelity/requirements.txt`）。
> 它是**獨立於** `parse_laws.py` 所用 pdftotext 的引擎 → 同時解決兩件事：(a) 官方 PDF 的中文
> 在缺 poppler-data 的機器也抽得出；(b) 作為獨立第二證人，破除 verify §4「重跑同一支 parser
> 比對自己」的循環基準。要改用 pdftotext 二進位：`PDFTOTEXT=<路徑> npm run fidelity:source`。

**誠實界線：** 機器只能保證「網頁 === 我們存的原文」。「我們存的原文 === 官方正本」最終仍需**人工簽核**（`ComplianceCheck.reviewedBy` / 幹部覆核）。

## 「逐字一致」定義（Kai 拍板：先嚴格）

無法比對「PDF 位元組」——PDF 沒有線性文字。我們比對的是**抽取後的實質字元**，正規化契約見 `canonicalize.ts`：

- **Level A（表意字流，headline）**：只留中日韓表意文字（含中文數字）。證明「每個中文字逐字對得上、順序正確、沒漏字沒竄改」。近乎零誤報。
- **Level B（完整正規化，review 級）**：NFC＋全形轉半形＋去所有空白＋去項次標記。連標點/數字/拉丁都比，差異列人工覆核。

只正規化掉「純版面雜訊」（換行、CJK 間空白、全半形、頁首頁尾、頁碼、parser 產生的項次標記）；**任何實質字元差異一律標記、不放行**。

## 現況與待辦（回應「你怎麼保證正確」）

- ✅ **① PDF → JSON：768/768 逐字命中**（PyMuPDF 獨立引擎，`npm run fidelity:source`，2026-07-02 起可隨時重跑）。
- ✅ **② JSON → DB：通過**（`npm run db:verify` §2）。
- ✅ **獨立第二證人**：PyMuPDF ≠ parse_laws 的 pdftotext，已破除 verify §4 的循環基準。（verify §4 仍用 pdftotext，缺 CJK 時**誠實 skip**、不假失敗；真正的獨立全量驗以 `fidelity:source` 為準。）
- ✅ **drift 守門**：`manifest.json` 768 條 SHA-256，進 git。

待辦：
1. 🖥️ **端到端 DOM 比對（Phase 3）**：render===DB 不夠，要用 Playwright 抓「瀏覽器實際畫出的字」，涵蓋 HTML 轉義／CSS ::before 插入符號／字體合字。頁面就緒後建。
2. 🚦 **CI 擋部署**：把可跑的驗證接進 CI，對不上就擋上線。PDF 為 gitignored → ① 在本機/有原檔的 runner 跑；② JSON↔DB、④ DOM 在 CI 跑。
3. 👤 **人工簽核**：機器保證「網頁===我們存的原文」；「我們存的原文===官方正本」最終由人覆核（`ComplianceCheck.reviewedBy`）。
4. （選）指紋回歸：CI 比對 `manifest.json` 與當前 JSON 的 SHA-256，抓任何未預期的法條文字變動。

## 已修正 / 已知殘留（2026-07-03）

- ✅ **1.15 §2 已修**：parser 曾把「45%、45%、10%」的第二個「45%」誤判成款號「45.」而拆錯款。
  已修 `parse_laws.py` 的 `RE_ITEM`（阿拉伯款號後須接 .、或空白才算款標記），並把該條款項合併回
  「…不超過總額 45%、45%、10%。」（逐字同 PDF，Level A/B 皆過），重灌 DB、db:verify 全綠。
  全庫掃過款號連續性，**此為唯一的款項 mis-split**。
- ℹ️ **殘留 11 條純外觀差異**（Level B 757/768，非內容問題）：款項編號的格式小差——
  「1. . 內文」重複點號（1.17 §2/§3/§5-8、1.18 §2）與 PDF 有款號但 DB 未切出（1.1 §49、2.0 §25、
  2.4 §5、3.0 §8）。中文與數字內容皆逐字正確，只影響款項編號顯示。
  已在 `RE_ITEM` 修正（吃掉標記的「.」），但**現行 JSON 未重生**（見下）故仍留舊格式。
- 🔧 **為何不整包重生 JSON**：原始 JSON 用「含 CJK 的 pdftotext」抽出；本機只有 PyMuPDF。用 PyMuPDF
  整包重抽雖修好上述外觀，但因 `parse_laws.py` 的條名偵測/數字空白啟發式是對 pdftotext 版面調的，
  會連帶改動條名與數字空白（見 1.17 §1-3）。故僅對 1.15 §2 做最小、可稽核的內容保真修正；
  外觀小差留待「裝 CJK pdftotext 做乾淨全量重抽」或「為 PyMuPDF 版面重調 parser」時一次清。

## 指令

- `npm run fidelity:source` — JSON 條文 ↔ PDF 全量逐字（需 CJK pdftotext）＋產生指紋 manifest。
- `npm run db:verify` — 計數／DB逐字／健康／回源（Phase 0）。
