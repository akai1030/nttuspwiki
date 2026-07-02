/**
 * 來源保真檢查（JSON 條文 ↔ 原始 PDF，逐字）。
 *
 * 在信任鏈中補上「PDF → JSON」這段的**全量**驗證（原本 verify.ts 只抽 20 條，且回源
 * 是重跑同一支 parser，抓不到 parser 自身的 bug）。本檢查用自己的正規化（見 canonicalize.ts），
 * 不重用 parse_laws.py 的斷句邏輯，因此能獨立抓出「解析器漏字/竄改/漏抽整條」這類問題。
 *
 * 對每條條文：
 *   Level A：其「表意字流」必須是該法規 PDF 表意字流的**連續子字串**（每個中文字逐字對得上）。
 *   順序 + 缺口：條文在 PDF 中位置遞增；相鄰條文間若出現「一整條份量」的未覆蓋中文，示警（漏抽偵測）。
 * 同時輸出：
 *   - data/fidelity/source-report.md（人可讀報告）
 *   - data/fidelity/manifest.json（每條 body 的 SHA-256 指紋，git 追蹤 → 之後任何法條變動都會在 diff 現形）
 *
 * 用法：npm run fidelity:source
 * 需求：pdftotext（poppler）在 PATH；20 屆現行版 PDF 在 01｜公開檢閱資料/…/20.第二十屆…（gitignored，本機執行）。
 * PDF 為現行版權威來源（現行 38 部法規無對應 Word；Word 交叉核對僅適用於有 .docx 的舊屆，另議）。
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadLaws, articleBody, PROJECT_ROOT, type JsonLaw } from "../shared";
import { cjkStream } from "./canonicalize";

const SESSION_DIR = path.join(
  PROJECT_ROOT,
  "01｜公開檢閱資料",
  "01｜【國立臺東大學學生會】法律規定",
  "20.第二十屆學生議會學生自治法規"
);

/** 大於此長度的「相鄰條文間未覆蓋中文」視為可疑（可能漏抽整條）。 */
const GAP_WARN = 40;

function walkPdfs(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir)) {
    const p = path.join(dir, ent);
    if (statSync(p).isDirectory()) out.push(...walkPdfs(p));
    else if (/\.pdf$/i.test(ent)) out.push(p);
  }
  return out;
}

/** 依法規編號在 20 屆 PDF 樹裡找檔（編號後必接 【 空白 ( （ 之一，避免 1.1 誤中 1.10）。 */
function findPdf(all: string[], number: string): string | null {
  const esc = number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^" + esc + "\\s*[【（(\\s]");
  const hits = all.filter((p) => re.test(path.basename(p)));
  return hits[0] ?? null;
}

// 預設抽取器＝PyMuPDF（extract_pdf.py）：獨立於 parse_laws.py 用的 pdftotext，且內建 CJK CMap
// →（a）在缺 poppler-data 的機器也抽得出中文；（b）作為獨立第二證人，破 verify §4 的循環基準。
// 若設 PDFTOTEXT 環境變數，則改用該 pdftotext 二進位（保留退路）。
const PDFTOTEXT = process.env.PDFTOTEXT;
const PYTHON = process.env.PYTHON || "python";
const EXTRACTOR = path.join(PROJECT_ROOT, "data", "fidelity", "extract_pdf.py");
const MAXBUF = 64 * 1024 * 1024;

function pdfText(pdfPath: string): string {
  if (PDFTOTEXT) {
    return execFileSync(PDFTOTEXT, ["-raw", pdfPath, "-"], { encoding: "utf8", maxBuffer: MAXBUF });
  }
  return execFileSync(PYTHON, [EXTRACTOR, pdfPath], { encoding: "utf8", maxBuffer: MAXBUF });
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

interface LawResult {
  number: string;
  name: string;
  pdf: string | null;
  articles: number;
  matched: number;
  outOfOrder: number;
  notFound: Array<{ no: string; name: string | null; preview: string }>;
  maxGap: number;
  /** PDF 有條文卻抽不出任何中文 → 抽取器缺 CJK 支援（工具問題，非資料問題）。 */
  extractorEmpty: boolean;
}

function checkLaw(law: JsonLaw, allPdfs: string[], manifest: Record<string, string>): LawResult {
  const pdf = findPdf(allPdfs, law.number);
  const res: LawResult = {
    number: law.number,
    name: law.name,
    pdf: pdf ? path.basename(pdf) : null,
    articles: law.articles.length,
    matched: 0,
    outOfOrder: 0,
    notFound: [],
    maxGap: 0,
    extractorEmpty: false,
  };

  // 指紋不依賴 PDF：先算齊，即使抽取器沒中文也能產出 manifest（drift 守門）。
  const bodyStreams = law.articles.map((a) => {
    const body = articleBody(a.items);
    manifest[`${law.number}#${a.number}`] = sha256(body);
    return { no: a.number, name: a.name || null, bodyA: cjkStream(body) };
  });
  if (!pdf) return res;

  const pdfA = cjkStream(pdfText(pdf));
  const lawHasCjk = bodyStreams.some((b) => b.bodyA.length > 0);
  if (pdfA.length === 0 && lawHasCjk) {
    // PDF 有條文、但抽取器吐不出任何中文 → 工具缺 CJK CMap，非資料問題。
    res.extractorEmpty = true;
    return res;
  }

  let cursor = 0;
  let prevEnd = -1;

  for (const { no, name, bodyA } of bodyStreams) {
    if (!bodyA) {
      res.matched++; // 空表意字流（極少見，如純數字條）視為不適用
      continue;
    }
    const fromCursor = pdfA.indexOf(bodyA, cursor);
    if (fromCursor >= 0) {
      res.matched++;
      if (prevEnd >= 0) {
        const gap = fromCursor - prevEnd;
        if (gap > res.maxGap) res.maxGap = gap;
      }
      prevEnd = fromCursor + bodyA.length;
      cursor = prevEnd;
    } else {
      const anywhere = pdfA.indexOf(bodyA);
      if (anywhere >= 0) {
        res.matched++;
        res.outOfOrder++;
        prevEnd = anywhere + bodyA.length;
        cursor = prevEnd;
      } else {
        res.notFound.push({ no, name, preview: bodyA.slice(0, 24) });
      }
    }
  }
  return res;
}

function main() {
  if (!existsSync(SESSION_DIR)) {
    console.error(`找不到 20 屆 PDF 目錄（gitignored，需本機）：\n  ${SESSION_DIR}`);
    process.exitCode = 1;
    return;
  }
  const laws = loadLaws();
  const allPdfs = walkPdfs(SESSION_DIR);
  console.log(`法規 ${laws.length} 部；20 屆 PDF ${allPdfs.length} 份。開始逐字比對…`);

  const manifest: Record<string, string> = {};
  const results = laws.map((l) => checkLaw(l, allPdfs, manifest));

  const totalArticles = results.reduce((s, r) => s + r.articles, 0);
  const totalMatched = results.reduce((s, r) => s + r.matched, 0);
  const noPdf = results.filter((r) => !r.pdf);
  const extractorEmpty = results.filter((r) => r.extractorEmpty);
  const checkable = results.filter((r) => r.pdf && !r.extractorEmpty);
  const withNotFound = results.filter((r) => r.notFound.length > 0);
  const outOfOrder = results.filter((r) => r.outOfOrder > 0);
  const bigGaps = results.filter((r) => r.maxGap > GAP_WARN);

  const lines: string[] = [];
  lines.push("# 來源保真報告 · JSON 條文 ↔ 原始 PDF（逐字）");
  lines.push("");
  lines.push(`> 正規化契約見 \`data/fidelity/canonicalize.ts\`（Level A 表意字流）。`);
  lines.push(`> 產生時間以 git 提交為準（本腳本不寫入時間，避免無意義 diff）。`);
  lines.push("");
  lines.push("## 總覽");
  lines.push("");
  lines.push(`- 法規：${laws.length} 部　條文：${totalArticles} 條`);
  lines.push(`- 可比對的法規（有 PDF 且抽得出中文）：${checkable.length} 部`);
  lines.push(`- **可比對範圍內逐字命中：${totalMatched} / ${totalArticles}**`);
  lines.push(`- 找不到 PDF 的法規：${noPdf.length}`);
  lines.push(`- ⏸️ 抽取器讀不到中文的法規（工具問題，非資料問題）：${extractorEmpty.length}`);
  lines.push(`- 有「條文文字在 PDF 找不到」的法規：${withNotFound.length}`);
  lines.push(`- 條文順序與 PDF 不一致的法規：${outOfOrder.length}`);
  lines.push(`- 相鄰條文間出現大缺口（>${GAP_WARN} 中文字，疑漏抽）的法規：${bigGaps.length}`);
  lines.push("");

  const toolBlocked = extractorEmpty.length > 0 && checkable.length === 0;
  const dataProblem = noPdf.length > 0 || withNotFound.length > 0;
  if (toolBlocked) {
    lines.push(
      "⏸️ **無法比對：此環境的 `pdftotext` 抽不出中文（缺 CJK CMap）。**這是工具問題，不是資料問題。"
    );
    lines.push(
      "修法：安裝含 CJK 支援的 poppler（poppler-data，內含 Adobe-CNS1/GB1 CMap），用 `PDFTOTEXT=<路徑> npm run fidelity:source` 指定該二進位（或設定 Xpdf 中文語言包）。"
    );
    lines.push("在此之前，PDF↔JSON 這段以 2026-07-02 的 `data/verify-report.md` §4（全量重抽一致）為準，並輔以人工/OCR/Word 對照。");
  } else if (dataProblem) {
    lines.push("🚩 **有需人工覆核的資料項目，見下。**");
  } else {
    lines.push(`✅ **可比對的 ${checkable.length} 部法規，全部條文逐字命中 PDF。**`);
  }
  lines.push("");
  if (extractorEmpty.length > 0 && !toolBlocked) {
    lines.push("## ⏸️ 抽取器讀不到中文（工具問題，該 PDF 這次跳過）");
    for (const r of extractorEmpty) lines.push(`- ${r.number}《${r.name}》`);
    lines.push("");
  }

  if (noPdf.length) {
    lines.push("## 🚩 找不到對應 PDF");
    for (const r of noPdf) lines.push(`- ${r.number}《${r.name}》`);
    lines.push("");
  }
  if (withNotFound.length) {
    lines.push("## 🚩 條文文字在 PDF 找不到（可能竄改/漏字/正規化未涵蓋）");
    for (const r of withNotFound) {
      lines.push(`### ${r.number}《${r.name}》　PDF: ${r.pdf}`);
      for (const nf of r.notFound) {
        lines.push(`- §${nf.no}${nf.name ? `（${nf.name}）` : ""}：表意字流前段「${nf.preview}…」比不到`);
      }
      lines.push("");
    }
  }
  if (bigGaps.length) {
    lines.push(`## ⚠️ 相鄰條文間大缺口（>${GAP_WARN} 中文字，人工確認是否漏抽整條）`);
    for (const r of bigGaps) lines.push(`- ${r.number}《${r.name}》最大缺口 ${r.maxGap} 中文字`);
    lines.push("");
  }
  if (outOfOrder.length) {
    lines.push("## ℹ️ 條文順序與 PDF 不一致（多為沿革/附表順序差，非漏字）");
    for (const r of outOfOrder) lines.push(`- ${r.number}《${r.name}》：${r.outOfOrder} 條`);
    lines.push("");
  }

  const reportPath = path.join(PROJECT_ROOT, "data", "fidelity", "source-report.md");
  const manifestPath = path.join(PROJECT_ROOT, "data", "fidelity", "manifest.json");
  writeFileSync(reportPath, lines.join("\n"), "utf8");
  // manifest 依 key 排序，確保輸出穩定（git diff 只在真的變動時出現）
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(manifest).sort()) sorted[k] = manifest[k];
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  console.log(`可比對 ${checkable.length} 部；逐字命中 ${totalMatched}/${totalArticles}`);
  console.log(`指紋 ${Object.keys(sorted).length} 條 → data/fidelity/manifest.json（drift 守門）`);
  if (toolBlocked) {
    console.error(
      "⏸️ 此環境 pdftotext 抽不出中文（缺 CJK CMap）→ 本檢查無法比對。裝 poppler-data 後重跑。見報告。"
    );
    process.exitCode = 2; // 2 = 工具問題（與資料問題的 1 區分）
  } else if (dataProblem) {
    console.error("🚩 有需覆核的資料項目，見報告。");
    process.exitCode = 1;
  }
}

main();
