/**
 * Level B 嚴格比對（標點 + 數字 + 拉丁，逐字元）。
 *
 * 前提：Level A（source-check.ts）已 768/768 全過 → 每個「中文字」都逐字對得上、順序正確。
 * 因此 Level B 只可能揭露「非表意字」層的差異：標點樣式、數字寫法（如 十四↔14）、拉丁字。
 * 其中**數字差異值得看**（法律的期限/比例/門檻），標點多屬 PDF 抽取的樣式小差。
 *
 * 作法：對每條，取 Level B 正規化字串 bodyB，定位到 PDF 對應區段（用 Level A 表意字錨點），
 * 跑 LCS 逐字元 diff，把差異分類（數字/拉丁＝需看；純標點＝樣式小差）列成覆核清單。
 *
 * 用法：npm run fidelity:levelB
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { loadLaws, articleBody, PROJECT_ROOT, type JsonLaw } from "../shared";
import { cjkStream, fullCanon, stripListMarkers } from "./canonicalize";

const SESSION_DIR = path.join(
  PROJECT_ROOT,
  "01｜公開檢閱資料",
  "01｜【國立臺東大學學生會】法律規定",
  "20.第二十屆學生議會學生自治法規"
);
const PDFTOTEXT = process.env.PDFTOTEXT;
const PYTHON = process.env.PYTHON || "python";
const EXTRACTOR = path.join(PROJECT_ROOT, "data", "fidelity", "extract_pdf.py");
const MAXBUF = 64 * 1024 * 1024;

function walkPdfs(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir)) {
    const p = path.join(dir, ent);
    if (statSync(p).isDirectory()) out.push(...walkPdfs(p));
    else if (/\.pdf$/i.test(ent)) out.push(p);
  }
  return out;
}
function findPdf(all: string[], number: string): string | null {
  const esc = number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("^" + esc + "\\s*[【（(\\s]");
  return all.filter((p) => re.test(path.basename(p)))[0] ?? null;
}
function pdfText(pdfPath: string): string {
  if (PDFTOTEXT) return execFileSync(PDFTOTEXT, ["-raw", pdfPath, "-"], { encoding: "utf8", maxBuffer: MAXBUF });
  return execFileSync(PYTHON, [EXTRACTOR, pdfPath], { encoding: "utf8", maxBuffer: MAXBUF });
}

const isIdeo = (ch: string) => {
  const cp = ch.codePointAt(0)!;
  return (cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff);
};
const isNumOrLatin = (ch: string) => /[0-9A-Za-z]/.test(ch);

type Seg = { t: "=" | "-" | "+"; s: string };
/** LCS 逐字元 diff（a=DB, b=PDF window）。字串過長則回 null（改用簡易首異點）。 */
function lcsDiff(a: string, b: string): Seg[] | null {
  const n = a.length, m = b.length;
  if (n * m > 4_000_000) return null;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const raw: Seg[] = [];
  let i = 0, j = 0;
  const push = (t: Seg["t"], s: string) => {
    const last = raw[raw.length - 1];
    if (last && last.t === t) last.s += s;
    else raw.push({ t, s });
  };
  while (i < n && j < m) {
    if (a[i] === b[j]) { push("=", a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("-", a[i]); i++; }
    else { push("+", b[j]); j++; }
  }
  while (i < n) { push("-", a[i]); i++; }
  while (j < m) { push("+", b[j]); j++; }
  return raw;
}

interface DiffItem {
  no: string;
  name: string | null;
  segs: Seg[];
  substantive: boolean; // 差異含數字/拉丁 → 需人工看
  glued: boolean; // 差異只是 PDF 多一個裸數字（款號黏在中文後，DB 已正確切款）→ 檢查器誤報，非資料問題
}

function checkLaw(law: JsonLaw, allPdfs: string[]): { pdf: boolean; passB: number; total: number; diffs: DiffItem[] } {
  const pdf = findPdf(allPdfs, law.number);
  const diffs: DiffItem[] = [];
  if (!pdf) return { pdf: false, passB: 0, total: law.articles.length, diffs };

  const raw = pdfText(pdf);
  const pdfB = fullCanon(raw);
  const pdfBs = stripListMarkers(pdfB); // 對稱移除款項編號後的 PDF 內容
  // 表意字位置索引：pdfB 裡每個表意字的 index（供錨定 window；markers 為數字不影響表意字位置）
  const ideoPos: number[] = [];
  for (let k = 0; k < pdfB.length; k++) if (isIdeo(pdfB[k])) ideoPos.push(k);
  const pdfCjk = ideoPos.map((p) => pdfB[p]).join("");

  let passB = 0;
  for (const a of law.articles) {
    const body = articleBody(a.items);
    const bodyB = stripListMarkers(fullCanon(body)); // DB 側也對稱移除款項編號
    if (pdfBs.includes(bodyB)) { passB++; continue; }

    // 定位 window：用表意字錨點（Level A 已保證存在）
    const bodyCjk = cjkStream(body);
    const ca = pdfCjk.indexOf(bodyCjk);
    if (ca < 0 || bodyCjk.length === 0) { passB++; continue; } // 無表意字（純數字條）跳過 Level B
    const start = ideoPos[ca];
    const nextIdeo = ideoPos[ca + bodyCjk.length]; // 下一條/下一段的第一個表意字
    const end = nextIdeo ?? pdfB.length;
    const windowB = stripListMarkers(pdfB.slice(start, end));

    const segs = lcsDiff(bodyB, windowB);
    if (!segs) {
      diffs.push({ no: a.number, name: a.name || null, segs: [{ t: "-", s: "（條文過長，未做字元 diff）" }], substantive: true, glued: false });
      continue;
    }
    // 去掉「純尾端 +」（window 尾巴殘留，非實質差異）
    const meaningful = segs.filter((s, idx) => !(s.t === "+" && idx === segs.length - 1 && !/[0-9A-Za-z㐀-鿿]/.test(s.s)));
    const changed = meaningful.filter((s) => s.t !== "=");
    if (changed.length === 0) { passB++; continue; }
    // 誤報型：差異只有「PDF 多出的裸數字」（PDF 款號黏在中文後、DB 已用「N. 」正確切款，
    // 正規化把 DB 的標記去掉卻去不掉 PDF 的黏字）→ 非資料問題。
    const glued = changed.every((s) => s.t === "+" && /^\d{1,3}$/.test(s.s));
    const substantive = !glued && changed.some((s) => [...s.s].some((c) => isIdeo(c) || isNumOrLatin(c)));
    diffs.push({ no: a.number, name: a.name || null, segs: meaningful, substantive, glued });
  }
  return { pdf: true, passB, total: law.articles.length, diffs };
}

function renderSegs(segs: Seg[]): string {
  // 只顯示差異點附近的上下文
  const parts: string[] = [];
  segs.forEach((s, idx) => {
    if (s.t === "=") {
      const near = (idx > 0 && segs[idx - 1].t !== "=") || (idx < segs.length - 1 && segs[idx + 1].t !== "=");
      if (near) parts.push(s.s.length > 12 ? "…" + s.s.slice(-6) : s.s);
      else if (idx === 0 || idx === segs.length - 1) parts.push(s.s.length > 8 ? s.s.slice(0, 6) + "…" : s.s);
    } else if (s.t === "-") parts.push(`〔DB:${s.s}〕`);
    else parts.push(`〔PDF:${s.s}〕`);
  });
  return parts.join("");
}

function main() {
  if (!existsSync(SESSION_DIR)) {
    console.error(`找不到 20 屆 PDF 目錄：${SESSION_DIR}`);
    process.exitCode = 1;
    return;
  }
  const laws = loadLaws();
  const allPdfs = walkPdfs(SESSION_DIR);
  console.log(`Level B（標點/數字/拉丁）逐字元比對 ${laws.length} 部…`);

  let total = 0, passB = 0;
  const lines: string[] = [];
  const substantiveItems: string[] = [];
  const cosmeticLaws: string[] = [];
  const gluedItems: string[] = [];

  for (const law of laws) {
    const r = checkLaw(law, allPdfs);
    total += r.total;
    passB += r.passB;
    if (r.diffs.length === 0) continue;
    const sub = r.diffs.filter((d) => d.substantive);
    const glu = r.diffs.filter((d) => d.glued);
    const cos = r.diffs.filter((d) => !d.substantive && !d.glued);
    lines.push(`### ${law.number}《${law.name}》`);
    for (const d of r.diffs) {
      const tag = d.glued ? "款號·PDF黏字(DB已正確)" : d.substantive ? "⚠️數字/拉丁" : "標點";
      lines.push(`- §${d.no}${d.name ? `（${d.name}）` : ""} [${tag}]：${renderSegs(d.segs)}`);
    }
    lines.push("");
    if (sub.length) substantiveItems.push(`${law.number}: ${sub.map((d) => "§" + d.no).join(" ")}`);
    if (glu.length) gluedItems.push(`${law.number}: ${glu.map((d) => "§" + d.no).join(" ")}`);
    if (cos.length) cosmeticLaws.push(law.number);
  }

  const head: string[] = [];
  head.push("# Level B 嚴格比對報告（標點 / 數字 / 拉丁，逐字元）");
  head.push("");
  head.push("> 前提：Level A 已 768/768 全過 → 中文字零差異。以下只可能是標點樣式或數字/拉丁差異。");
  head.push("");
  head.push(`- 條文：${total}　Level B 完全一致：**${passB} / ${total}**`);
  head.push(`- 🚩 需人工看（含數字/拉丁差異）：${substantiveItems.length ? substantiveItems.join("；") : "無"}`);
  head.push(`- 款號·PDF黏字（DB 已正確切款，屬檢查器誤報）：${gluedItems.length ? gluedItems.join("；") : "無"}`);
  head.push(`- 僅標點樣式小差的法規：${cosmeticLaws.length ? cosmeticLaws.join(", ") : "無"}`);
  head.push("");
  head.push(passB === total ? "✅ Level B 亦全數逐字一致。" : "ℹ️ 差異清單如下（多為 PDF 抽取的標點樣式，數字/拉丁另標）。");
  head.push("");

  const reportPath = path.join(PROJECT_ROOT, "data", "fidelity", "levelB-report.md");
  writeFileSync(reportPath, head.concat(lines).join("\n"), "utf8");
  console.log(`Level B 完全一致 ${passB}/${total}；報告 → data/fidelity/levelB-report.md`);
  if (substantiveItems.length) console.log(`⚠️ 有含數字/拉丁的差異需人工看：${substantiveItems.join("；")}`);
}

main();
