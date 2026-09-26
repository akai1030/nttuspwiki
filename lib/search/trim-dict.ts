/**
 * 從完整繁體字典（dict.txt.big，58 萬詞）裁出「法規語料用得到的詞」→ dict.trimmed.txt.gz。
 *
 * 為什麼要裁：完整字典載進 jieba 後常駐約 150MB，是線上服務記憶體的最大宗；
 * 但我們只斷 38 部法規與查詢字串，用得到的詞只有幾萬個。
 *
 * 為什麼裁完斷詞結果「一字不差」：jieba 對一段文字只會查「該段文字的子字串」是不是詞，
 * 所以只要保留「是語料子字串」的詞，語料的候選詞圖（DAG）就完全相同。
 * 唯一的連動是路徑機率要除以全字典的總詞頻（log total），所以被裁掉的詞頻加總後
 * 塞進一個語料裡不會出現的佔位詞（私用區字元），讓 total 維持原值。
 * → 既有 tsv 不必重建；查詢若含語料裡根本沒有的詞，切法可能不同，但那種詞本來就查不到。
 *
 * 語料＝法規 JSON 的現行版＋git 歷史每一版（線上 DB 可能停在舊版條文）＋各部 MD 原檔。
 * 產出後會把整份語料用新舊兩本字典各斷一次（cut 與 cutForSearch），有任何一段不同就報錯、不寫檔。
 *
 * 用法：npm run search:trim-dict   （法規 JSON 有改就重跑，接著 npm run search:index）
 */
import { Jieba } from "@node-rs/jieba";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

const ROOT = process.cwd();
const FULL = path.join(ROOT, "lib", "search", "dict.txt.big.gz");
const OUT = path.join(ROOT, "lib", "search", "dict.trimmed.txt.gz");
const LAW_JSON = "法規MD轉檔/法規結構化-第20屆.json";
const MD_DIR = path.join(ROOT, "法規MD轉檔", "每份法規MD");
const MD_ALL = path.join(ROOT, "法規MD轉檔", "現行法規合集-第20屆.md");
// 佔位詞：私用區字元，法規與正常查詢不會出現。只用來撐住總詞頻。
const PLACEHOLDER = "";

/** 收集 JSON 裡所有字串值（條文、條名、款項…），不管巢狀多深。 */
function collectStrings(v: unknown, out: string[]): void {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectStrings(x, out));
}

function corpus(): string[] {
  const texts: string[] = [];
  collectStrings(JSON.parse(readFileSync(path.join(ROOT, LAW_JSON), "utf8")), texts);
  // 歷史版本：沒有 .git（例如 tarball）就只用現行版，並講一聲。
  try {
    const shas = execSync(`git log --format=%H -- "${LAW_JSON}"`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const sha of shas) {
      const json = execSync(`git show ${sha}:"${LAW_JSON}"`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      collectStrings(JSON.parse(json), texts);
    }
    console.log(`法規 JSON：現行版＋git 歷史 ${shas.length} 版`);
  } catch {
    console.warn("⚠️ 讀不到 git 歷史，只用現行版法規 JSON。");
  }
  texts.push(readFileSync(MD_ALL, "utf8"));
  for (const f of readdirSync(MD_DIR).filter((f) => f.endsWith(".md"))) {
    texts.push(readFileSync(path.join(MD_DIR, f), "utf8"));
  }
  return texts;
}

function main() {
  const fullBuf = gunzipSync(readFileSync(FULL));
  const lines = fullBuf.toString("utf8").split("\n").filter((l) => l.trim());
  const entries = lines.map((line) => {
    const [word, freq] = line.split(" ");
    return { line, word, freq: Number(freq) || 0 };
  });
  const words = new Set(entries.map((e) => e.word));
  const maxLen = entries.reduce((m, e) => Math.max(m, e.word.length), 0);

  const texts = corpus();
  const used = new Set<string>();
  for (const t of texts) {
    for (let i = 0; i < t.length; i++) {
      for (let len = 1; len <= maxLen && i + len <= t.length; len++) {
        const sub = t.slice(i, i + len);
        if (words.has(sub)) used.add(sub);
      }
    }
  }

  const kept = entries.filter((e) => used.has(e.word));
  const removedFreq = entries.reduce((s, e) => s + e.freq, 0) - kept.reduce((s, e) => s + e.freq, 0);
  const trimmed = kept.map((e) => e.line).concat(`${PLACEHOLDER} ${removedFreq}`).join("\n") + "\n";
  const trimmedBuf = Buffer.from(trimmed, "utf8");

  // 自我驗證：語料用兩本字典斷出來必須完全一樣，否則不寫檔。
  const full = Jieba.withDict(fullBuf);
  const small = Jieba.withDict(trimmedBuf);
  let diff = 0;
  for (const t of texts) {
    for (const piece of t.split("\n")) {
      const same =
        full.cut(piece, true).join("|") === small.cut(piece, true).join("|") &&
        full.cutForSearch(piece, true).join("|") === small.cutForSearch(piece, true).join("|");
      if (!same) {
        diff += 1;
        if (diff <= 5) console.error(`斷詞不一致：${piece.slice(0, 60)}`);
      }
    }
  }
  if (diff > 0) {
    console.error(`❌ 有 ${diff} 段斷詞結果與完整字典不同，不寫檔。`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(OUT, gzipSync(trimmedBuf, { level: 9 }));
  console.log(`完成。${entries.length} 詞 → ${kept.length} 詞；語料 ${texts.length} 份斷詞與完整字典一致。`);
  console.log(`寫入 ${path.relative(ROOT, OUT)}（${(readFileSync(OUT).length / 1024).toFixed(0)} KB）`);
}

main();
